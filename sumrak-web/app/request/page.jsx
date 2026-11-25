import RequestDashboard from '../../components/RequestDashboard';

export const metadata = { title: 'Личный просмотр маршрута', robots: { index: false, follow: false } };

export default function RequestPage() {
  return <RequestDashboard />;
}
