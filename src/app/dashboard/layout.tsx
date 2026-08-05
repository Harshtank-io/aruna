import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scout desk',
  description:
    'Drop a pin, read golden hour and sun angle, and generate an Aruna AI briefing for your shoot.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
