export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="text-slate-500 mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
