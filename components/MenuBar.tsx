import React, { useState, useRef, useEffect } from 'react';

interface MenuBarProps {
    onSave: () => void;
    onImport: () => void;
    onExport: () => void;
    onAddAudioTrack: () => void;
    onAddMidiTrack: () => void;
    onRemoveSelectedTrack: () => void;
    isTrackSelected: boolean;
}

const Menu: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1 text-sm rounded hover:bg-white/10 transition-colors"
            >
                {label}
            </button>
            {isOpen && (
                <div 
                    className="absolute top-full left-0 mt-1 w-56 bg-[var(--color-bg-surface-light)] rounded-md shadow-lg border border-[var(--color-border)] z-50 py-1"
                    onClick={() => setIsOpen(false)}
                >
                    {children}
                </div>
            )}
        </div>
    );
};

const MenuItem: React.FC<{onClick: () => void, disabled?: boolean, shortcut?: string, children: React.ReactNode}> = ({ onClick, disabled, shortcut, children }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full text-left px-3 py-1.5 text-sm flex justify-between items-center text-[var(--color-text-primary)] hover:bg-[var(--color-accent-blue)] hover:text-white disabled:text-gray-500 disabled:hover:bg-transparent"
    >
        <span>{children}</span>
        {shortcut && <span className="text-xs text-[var(--color-text-secondary)]">{shortcut}</span>}
    </button>
);


const MenuBar: React.FC<MenuBarProps> = ({ onSave, onImport, onExport, onAddAudioTrack, onAddMidiTrack, onRemoveSelectedTrack, isTrackSelected }) => {
  return (
    <div className="flex items-center space-x-1 p-1 bg-[var(--color-bg-transport)] border-b-2 border-[var(--color-border)] flex-shrink-0 h-10">
      <Menu label="File">
        <MenuItem onClick={onSave} shortcut="⌘S">Save Project</MenuItem>
        <MenuItem onClick={onImport} shortcut="⌘I">Import Audio File...</MenuItem>
        <MenuItem onClick={onExport} shortcut="⌘E">Export as WAV...</MenuItem>
      </Menu>
      <Menu label="Track">
        <MenuItem onClick={onAddAudioTrack} shortcut="⇧⌘A">Add Audio Track</MenuItem>
        <MenuItem onClick={onAddMidiTrack} shortcut="⇧⌘M">Add MIDI Track</MenuItem>
        <hr className="border-gray-700 my-1" />
        <MenuItem onClick={onRemoveSelectedTrack} disabled={!isTrackSelected} shortcut="Backspace">Delete Selected Track</MenuItem>
      </Menu>
    </div>
  );
};

export default MenuBar;
