/**
 * Website enquiries and newsletter signups — a port of
 * dristi-admin-app/lib/screens/messages_screen.dart.
 *
 * The Contact form and subscribe box both land here: the store's domain has no
 * mailbox, so this screen is the delivery route.
 */
import { useCallback, useState } from 'react';
import { AtSign, Copy, Mail, MailOpen, MoreHorizontal, Trash } from '../components/icons';
import * as api from '../lib/api';
import { errorMessage } from '../lib/apiClient';
import { whenLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import type { ContactMessage, NewsletterSubscriber } from '../types';
import { useConfirm, useToast } from '../context/AdminContext';
import { PageBody, PageHeader } from '../components/AdminShell';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, Button, DropdownMenu, MenuItem } from '../components/primitives';
import { Modal, PillTabs } from '../components/ui';
import type { PageProps } from './types';

type Tab = 'enquiries' | 'subscribers';

/** Clipboard writes need a user gesture and can still be blocked. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function MessagesPage(_: PageProps) {
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

  const messageColumns: Column<ContactMessage>[] = [
    {
      id: 'from',
      header: 'From',
      sortValue: m => m.fullName,
      cell: m => (
        <div className="flex items-center gap-2.5">
          {!m.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
          <div className="min-w-0">
            <p className={`truncate text-foreground ${m.isRead ? 'font-normal' : 'font-semibold'}`}>
              {m.fullName}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      sortValue: m => m.subject ?? m.message,
      cell: m => (
        <p className="truncate text-muted-foreground">{m.subject || m.message}</p>
      ),
    },
    {
      id: 'received',
      header: 'Received',
      align: 'right',
      secondary: true,
      sortValue: m => m.createdAt ?? '',
      cell: m => <span className="text-muted-foreground">{whenLocal(m.createdAt)}</span>,
    },
  ];

  const subscriberColumns: Column<NewsletterSubscriber>[] = [
    {
      id: 'email',
      header: 'Email',
      sortValue: s => s.email,
      cell: s => (
        <div className="flex items-center gap-2.5">
          <span className="text-subtle-foreground">
            <AtSign size={14} />
          </span>
          <span className="truncate text-foreground">{s.email}</span>
        </div>
      ),
    },
    {
      id: 'joined',
      header: 'Subscribed',
      align: 'right',
      sortValue: s => s.createdAt ?? '',
      cell: s => <span className="text-muted-foreground">{whenLocal(s.createdAt)}</span>,
    },
  ];

  return (
    <PageBody>
      <PageHeader
        title="Messages"
        description="Enquiries from the website's contact form, and newsletter signups."
        actions={
          tab === 'subscribers' && subscribers.length > 0 ? (
            <Button variant="outline" icon={Copy} onClick={copyAll}>
              Copy all addresses
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5">
        <PillTabs<Tab>
          tabs={[
            { id: 'enquiries', label: 'Enquiries', count: unread || messages.length },
            { id: 'subscribers', label: 'Subscribers', count: subscribers.length },
          ]}
          active={tab}
          onSelect={setTab}
        />
      </div>

      {tab === 'enquiries' ? (
        <DataTable
          rows={messages}
          columns={messageColumns}
          rowKey={m => m.id}
          loading={loading}
          onRowClick={openMessage}
          initialSort={{ id: 'received', dir: 'desc' }}
          rowActions={m => (
            <DropdownMenu
              label={`Actions for the enquiry from ${m.fullName}`}
              trigger={
                <span className="grid size-8 place-items-center rounded-lg text-subtle-foreground transition-colors duration-150 hover:bg-hover hover:text-foreground">
                  <MoreHorizontal size={16} />
                </span>
              }
            >
              <MenuItem icon={MailOpen} onSelect={() => openMessage(m)}>
                Read
              </MenuItem>
              <MenuItem icon={Copy} onSelect={() => copyToClipboard(m.email)}>
                Copy email
              </MenuItem>
              <MenuItem icon={Trash} destructive onSelect={() => remove(m)}>
                Delete
              </MenuItem>
            </DropdownMenu>
          )}
          empty={{
            icon: MailOpen,
            title: error ? 'Could not load messages' : 'No enquiries yet',
            description: error ?? 'Messages sent from the website contact form land here.',
          }}
        />
      ) : (
        <DataTable
          rows={subscribers}
          columns={subscriberColumns}
          rowKey={s => s.id}
          loading={loading}
          initialSort={{ id: 'joined', dir: 'desc' }}
          empty={{
            icon: AtSign,
            title: 'No newsletter signups yet',
            description: "Addresses captured by the footer's subscribe box land here.",
          }}
        />
      )}

      {open && <MessageDialog message={open} onClose={() => setOpen(null)} />}
    </PageBody>
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

  return (
    <Modal
      title={message.subject || 'Enquiry'}
      description={`${message.fullName} · ${whenLocal(message.createdAt)}`}
      icon={Mail}
      onClose={onClose}
      wide
      actions={
        <>
          <Button variant="outline" icon={Copy} onClick={copyEmail}>
            Copy email
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge>{message.email}</Badge>
        {!message.isRead && <Badge color="var(--color-primary)">New</Badge>}
      </div>
      <div className="rounded-lg border border-border bg-hover/50 p-4">
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">{message.message}</p>
      </div>
    </Modal>
  );
}
