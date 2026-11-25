import HomePage from '../components/HomePage';

export const metadata = {
  title: 'Одно маленькое приглашение',
  description: 'У меня есть к тебе один вопрос.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <HomePage />;
}
