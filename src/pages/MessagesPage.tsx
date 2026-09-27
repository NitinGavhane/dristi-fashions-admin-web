/**
 * Website enquiries and newsletter signups — a port of
 * dristi-admin-app/lib/screens/messages_screen.dart.
 *
 * The Contact form and subscribe box both land here: the store's domain has no
 * mailbox, so this screen is the delivery route.
 */
import { useCallback, useState } from 'react';
import { AtSign, Copy, Mail, MailOpen, Trash } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import type { ContactMessage } from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody } from '../components/AdminShell';
import {
  BrandLoader,
  EmptyBox,
  FloatingAction,
  ListCard,
  Modal,
  PageHeader,
  PillTabs,
  PrimaryButton,
} from '../components/ui';
import type { PageProps } from './types';

type Tab = 'enquiries' | 'subscribers';

/** Clipboard writes need a user gesture and can still be blocked; report either way. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function MessagesPage({ onMenu }: PageProps) {
  const [tab, setTab] = useState<Tab>('enquiries');
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState<ContactMessage | null>(null);

  const fetch = useCallback(async () => {
    const [messages, subscribers] = await Promise.all([
      api.getContactMessages(),
      api.getNewsletterSubscribers(),
    ]);
    return { messages, subscribers };
  }, []);

  const { data, loading, error, reload } = useAsync(fetch, []);

  const messages = data?.messages ?? [];
  const subscribers = data?.subscribers ?? [];
  const unread = messages.filter(m => !m.isRead).length;

  const openMessage = async (m: ContactMessage) => {
    setOpen(m);
    if (!m.isRead) {
      try {
        await api.markContactMessageRead(m.id);
        reload();
      } catch {
        /* marking read is best-effort; the dialog still opens */
      }
    }
  };

  const remove = async (m: ContactMessage) => {
    const ok = await confirm({ message: `Delete the enquiry from ${m.fullName}?` });
    if (!ok) return;
    try {
      await api.deleteContactMessage(m.id);
      toast('Enquiry deleted', { success: true });
      reload();
    } catch (e) {
      toast(`Delete failed: ${errorMessage(e)}`, { error: true });
    }
  };

  const copyAll = async () => {
    if (subscribers.length === 0) return;
    const ok = await copyToClipboard(subscribers.map(s => s.email).join(', '));
    toast(ok ? `${subscribers.length} email addresses copied` : 'Could not copy — check clipboard permissions', {
      success: ok,
      error: !ok,
    });
  };

  const enquiryList = () => {
    if (messages.length === 0) {
      return <EmptyBox icon={MailOpen} message="No enquiries from the website yet" />;
    }
    return messages.map(m => (
      <ListCard key={m.id} className="mb-2.5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => openMessage(m)}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <span
              className="mt-1.5 block size-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: m.isRead ? 'transparent' : 'var(--color-accent)',
                border: m.isRead ? '1px solid var(--color-hair)' : undefined,
              }}
            />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm text-ink ${m.isRead ? 'font-semibold' : 'font-extrabold'}`}>
                {m.fullName}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-soft">{m.subject || m.message}</span>
              <span className="mt-1 block truncate text-[11px] text-muted">
                {m.email} · {whenLocal(m.createdAt)}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => remove(m)}
            aria-label={`Delete enquiry from ${m.fullName}`}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-error text-error transition hover:bg-error/5"
          >
            <Trash size={15} />
          </button>
        </div>
      </ListCard>
    ));
  };

  const subscriberList = () => {
    if (subscribers.length === 0) return <EmptyBox icon={AtSign} message="No newsletter signups yet" />;
    return subscribers.map(s => (
      <ListCard key={s.id} className="mb-2.5">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-accent">
            <AtSign size={17} />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{s.email}</p>
          <p className="shrink-0 text-[11px] text-muted">{whenLocal(s.createdAt)}</p>
        </div>
      </ListCard>
    ));
  };

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle={
          unread > 0
            ? `${unread} unread · ${subscribers.length} subscribers`
            : `${messages.length} enquiries · ${subscribers.length} subscribers`
        }
        onMenu={onMenu}
      />
      <PageBody>
        <PillTabs<Tab>
          tabs={[
            { id: 'enquiries', label: 'Enquiries' },
            { id: 'subscribers', label: 'Subscribers' },
          ]}
          active={tab}
          onSelect={setTab}
        />

        <div className="mt-3">
          {loading ? (
            <BrandLoader />
          ) : error ? (
            <EmptyBox icon={Mail} message={`Could not load messages: ${error}`} />
          ) : tab === 'subscribers' ? (
            subscriberList()
          ) : (
            enquiryList()
          )}
        </div>
      </PageBody>

      {tab === 'subscribers' && subscribers.length > 0 && (
        <FloatingAction onClick={copyAll} label="Copy all email addresses" icon={Copy} />
      )}

      {open && <MessageDialog message={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function MessageDialog({ message, onClose }: { message: ContactMessage; onClose: () => void }) {
  const toast = useToast();

  const copyEmail = async () => {
    const ok = await copyToClipboard(message.email);
    toast(ok ? 'Email address copied' : 'Could not copy — check clipboard permissions', {
      success: ok,
      error: !ok,
    });
  };

  const row = (label: string, value: string) => (
    <div className="mb-1.5 flex items-start gap-3">
      <span className="w-[74px] shrink-0 text-xs text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-ink">{value}</span>
    </div>
  );

  return (
    <Modal
      title={message.subject || 'Enquiry'}
      icon={Mail}
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            onClick={copyEmail}
            className="flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[11px] text-muted transition hover:text-ink"
          >
            <Copy size={15} />
            COPY EMAIL
          </button>
          <PrimaryButton label="Close" full={false} onClick={onClose} />
        </>
      }
    >
      {row('From', message.fullName)}
      {row('Email', message.email)}
      {row('Received', whenLocal(message.createdAt))}
      <div className="mt-3.5 rounded-lg border border-hair bg-white/[0.03] p-3.5">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{message.message}</p>
      </div>
    </Modal>
  );
}
