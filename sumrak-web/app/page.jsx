import HomePage from '../components/HomePage';

export const metadata = {
  title: { default: 'With love | A Little Invitation' },
  description: 'У меня есть к тебе один вопрос.',
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.png",
  },
};

export default function Page() {
  return <HomePage />;
}
