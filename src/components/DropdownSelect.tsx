import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [isOpen]);

  const openListbox = (direction: 'first' | 'last' = 'first') => {
    if (disabled || options.length === 0) return;

    const initialIndex =
      selectedIndex >= 0
        ? selectedIndex
        : direction === 'first'
          ? 0
          : options.length - 1;
    setActiveIndex(initialIndex);
    setIsOpen(true);
  };

  const selectOption = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openListbox(event.key === 'ArrowUp' ? 'last' : 'first');
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) selectOption(options[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openListbox())}
        onKeyDown={handleKeyDown}
        className="ov-field flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedOption ? 'text-neutral-100' : 'text-neutral-400'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      <ul
        id={listboxId}
        role="listbox"
        aria-label={label}
        hidden={!isOpen}
        className="ov-panel ov-panel-translucent mt-2 max-h-64 w-full overflow-y-auto p-1.5"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;

          return (
            <li
              id={`${id}-option-${index}`}
              key={option.value}
              role="option"
              aria-selected={isSelected}
              onClick={() => selectOption(option)}
              onPointerMove={() => setActiveIndex(index)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-950/70 text-neutral-100'
                  : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-neutral-100'
              }`}
            >
              <span>{option.label}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-orange-300" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
