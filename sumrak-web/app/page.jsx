import HomePage from '../components/HomePage';

const description = 'Выберите бронирование, тонирование или растонирование элементов автомобиля и отправьте заявку.';

export const metadata = {
  title: 'Бронирование, тонирование и растонирование',
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Сумрак — бронирование и тонирование',
    description,
    url: '/',
    type: 'website',
  },
};

export default function Page() {
  return <HomePage />;
}
