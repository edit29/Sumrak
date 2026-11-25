import DatePlanner from '../../components/DatePlanner';

export const metadata = { title: 'Наш маршрут', description: 'Собери свой идеальный маршрут свидания.', robots: { index: false, follow: false } };

export default function DatePage() {
  return <DatePlanner />;
}
