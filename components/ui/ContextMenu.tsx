import React, { useRef, useEffect } from 'react';

interface MenuItem {
    label: string;
    action: () => void;
    disabled?: boolean;
    shortcut?: string;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Adjust position to ensure the menu stays within the viewport
    const menuStyle: React.CSSProperties = {
        top: y,
        left: x,
    };
    if (menuRef.current) {
        const menuRect = menuRef.current.getBoundingClientRect();
        if (y + menuRect.height > window.innerHeight) {
            menuStyle.top = window.innerHeight - menuRect.height - 10;
        }
        if (x + menuRect.width > window.innerWidth) {
            menuStyle.left = window.innerWidth - menuRect.width - 10;
        }
    }


    return (
        <div
            ref={menuRef}
            style={menuStyle}
            className="fixed w-48 bg-[var(--color-bg-surface-light)] rounded-md shadow-2xl border border-[var(--color-border)] z-50 py-1"
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => { item.action(); onClose(); }}
                    disabled={item.disabled}
                    className="w-full text-left px-3 py-1.5 text-sm flex justify-between items-center text-[var(--color-text-primary)] hover:bg-[var(--color-accent-blue)] hover:text-white disabled:text-gray-500 disabled:hover:bg-transparent"
                >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="text-xs text-[var(--color-text-secondary)]">{item.shortcut}</span>}
                </button>
            ))}
        </div>
    );
};

export default ContextMenu;
