import DatePlanner from '../../components/DatePlanner';

export const metadata = { title: { default: 'With love ' }, robots: { index: false, follow: false },icons: {
    icon: "/favicon.png"
  }, };

export default function DatePage() {
  return <DatePlanner />;
}
