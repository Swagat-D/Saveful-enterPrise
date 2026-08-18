type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="font-saveful text-xs uppercase tracking-[0.2em] text-saveful-green">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-saveful-bold text-3xl text-gray-900 md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl font-saveful text-sm text-gray-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
