import CreatorDetailClient from './CreatorDetailClient';

export function generateStaticParams() {
  return [
    { id: 'cr-1' },
    { id: 'cr-2' },
    { id: 'cr-3' },
    { id: 'cr-4' },
    { id: 'cr-5' },
    { id: 'demo' }
  ];
}

export default function CreatorDetailPage({ params }: { params: { id: string } }) {
  return <CreatorDetailClient creatorId={params.id} />;
}
