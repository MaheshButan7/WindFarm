export default function TurbineDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Turbine {params.id}</h1>
      <p className="text-muted-foreground">Turbine detail page coming soon...</p>
    </div>
  );
}

