import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PushSubscriptionRow } from '@/lib/types';

type NotificationInput = {
  recipientIds: string[];
  type: string;
  icon: string;
  title: string;
  sub?: string | null;
  target?: string | null;
  persistent?: boolean;
};

let vapidReady = false;
function configurePush() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidReady = true;
  }
  return true;
}

export async function createNotifications(input: NotificationInput) {
  const recipientIds = [...new Set(input.recipientIds)].filter(Boolean);
  if (!recipientIds.length) return;
  const admin = createAdminClient();
  const rows = recipientIds.map((recipient_id) => ({
    recipient_id,
    type: input.type,
    icon: input.icon,
    title: input.title,
    sub: input.sub ?? null,
    target: input.target ?? null,
    read: false,
    dismissed: false,
    persistent: input.persistent ?? false,
  }));
  const { data: created } = await admin.from('notifications').insert(rows as never).select('*');
  if (!created || !configurePush()) return;
  await Promise.all((created as Array<{ id: number; recipient_id: string; title: string; sub: string | null; target: string | null }>).map(async (notification) => {
    const { data: subscriptions } = await admin.from('push_subscriptions').select('*').eq('user_id', notification.recipient_id).returns<PushSubscriptionRow[]>();
    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: notification.title, body: notification.sub ?? '', url: notification.target ?? '/' }));
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      }
    }));
  }));
}

export async function notifyStaffForBuilding(buildingId: string, input: Omit<NotificationInput, 'recipientIds'>) {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('id, role').or(`building_id.eq.${buildingId},role.eq.superadmin`);
  await createNotifications({ ...input, recipientIds: (data ?? []).filter((p: { role: string }) => p.role === 'admin' || p.role === 'superadmin').map((p: { id: string }) => p.id) });
}

export async function notifyResidentsForBuilding(buildingId: string, input: Omit<NotificationInput, 'recipientIds'>) {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('id').eq('role', 'resident').eq('building_id', buildingId);
  await createNotifications({ ...input, recipientIds: (data ?? []).map((p: { id: string }) => p.id) });
}

export async function notifyUser(recipientId: string, input: Omit<NotificationInput, 'recipientIds'>) {
  await createNotifications({ ...input, recipientIds: [recipientId] });
}
