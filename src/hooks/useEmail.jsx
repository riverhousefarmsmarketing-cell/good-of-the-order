import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth.jsx';

export function useEmail() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  // === Distribution Contacts ===
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!orgId) return;
    setContactsLoading(true);
    const { data } = await supabase
      .from('distribution_contacts')
      .select('*')
      .eq('organization_id', orgId)
      .order('group_label')
      .order('full_name');
    setContacts(data || []);
    setContactsLoading(false);
  }, [orgId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const saveContact = async (contact) => {
    const { id, ...fields } = contact;
    if (id && !id.startsWith('_')) {
      const { error } = await supabase.from('distribution_contacts').update(fields).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('distribution_contacts').insert({ ...fields, organization_id: orgId });
      if (error) throw error;
    }
    await fetchContacts();
  };

  const deleteContact = async (id) => {
    const { error } = await supabase.from('distribution_contacts').delete().eq('id', id);
    if (error) throw error;
    await fetchContacts();
  };

  const importContactsFromMembers = async (members) => {
    // Import active members who aren't already in distribution list
    const existingEmails = new Set(contacts.map(c => c.email.toLowerCase()));
    const newContacts = members
      .filter(m => m.is_active && m.email && !existingEmails.has(m.email.toLowerCase()))
      .map(m => ({
        organization_id: orgId,
        full_name: m.full_name,
        email: m.email,
        group_label: m.board_position || 'Board',
        is_active: true,
      }));
    if (newContacts.length === 0) return 0;
    const { error } = await supabase.from('distribution_contacts').insert(newContacts);
    if (error) throw error;
    await fetchContacts();
    return newContacts.length;
  };

  // === Send Email ===
  // SECURITY: organization_id and sent_by are derived server-side from JWT
  const sendEmail = async ({ to, subject, html, documentType, documentId, fromName }) => {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        from_name: fromName || 'GoodOfTheOrder',
        document_type: documentType,
        document_id: documentId,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // === Distribution Logs ===
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!orgId) return;
    setLogsLoading(true);
    const { data } = await supabase
      .from('distribution_logs')
      .select('*, sent_by_profile:profiles!distribution_logs_sent_by_fkey(full_name)')
      .eq('organization_id', orgId)
      .order('sent_at', { ascending: false })
      .limit(100);
    setLogs(data || []);
    setLogsLoading(false);
  }, [orgId]);

  const fetchLogsForDocument = useCallback(async (docType, docId) => {
    if (!orgId) return [];
    const { data } = await supabase
      .from('distribution_logs')
      .select('*, sent_by_profile:profiles!distribution_logs_sent_by_fkey(full_name)')
      .eq('organization_id', orgId)
      .eq('document_type', docType)
      .eq('document_id', docId)
      .order('sent_at', { ascending: false });
    return data || [];
  }, [orgId]);

  return {
    contacts, contactsLoading, fetchContacts, saveContact, deleteContact, importContactsFromMembers,
    sendEmail,
    logs, logsLoading, fetchLogs, fetchLogsForDocument,
  };
}
