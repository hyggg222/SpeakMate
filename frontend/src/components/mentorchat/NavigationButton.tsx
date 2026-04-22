'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Props {
    label: string;
    href: string;
}

export default function NavigationButton({ label, href }: Props) {
    return (
        <Link href={href}
            className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-xl text-sm font-medium text-white transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--teal)' }}>
            {label} <ArrowRight size={14} />
        </Link>
    );
}
