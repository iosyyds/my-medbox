const Icon = ({ children, size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

export const PillIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M10.5 20.5a7 7 0 1 1 7-7 4.5 4.5 0 0 1-4.5 4.5Z" />
    <path d="m8.5 8.5 7 7" />
  </Icon>
);

export const SearchIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

export const CameraIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </Icon>
);

export const PlusIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CloseIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export const SaveIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </Icon>
);

export const EditIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Icon>
);

export const TrashIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);

export const CalendarIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
);

export const WarningIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
);

export const CheckIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </Icon>
);

export const ClockIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
);

export const BanIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </Icon>
);

export const FactoryIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
  </Icon>
);

export const TagIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </Icon>
);

export const NoteIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Icon>
);

export const SparklesIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const UploadIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m17 8-5-5-5 5M12 3v12" />
  </Icon>
);

export const ImageIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </Icon>
);

export const ScanIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </Icon>
);

export const FilterIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Icon>
);

export const ChevronDownIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const InfoIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Icon>
);

export const HeartIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </Icon>
);

export const ShieldIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </Icon>
);

export const ZapIcon = ({ size, className, ...props }) => (
  <Icon size={size} className={className} {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Icon>
);
