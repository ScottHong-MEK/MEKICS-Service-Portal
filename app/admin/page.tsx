import { getUserList } from '@/app/actions';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const users = await getUserList();
  return <AdminClient users={users} />;
}