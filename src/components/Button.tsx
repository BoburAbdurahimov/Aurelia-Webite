import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    magnetic?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', magnetic = true, children, ...props }, ref) => {
        const buttonRef = useRef<HTMLButtonElement | null>(null);

        useEffect(() => {
            const button = buttonRef.current;
            if (!button || !magnetic) return;

            const xTo = gsap.quickTo(button, "x", { duration: 0.8, ease: "power3", force3D: true });
            const yTo = gsap.quickTo(button, "y", { duration: 0.8, ease: "power3", force3D: true });

            const handleMouseMove = (e: MouseEvent) => {
                const { clientX, clientY } = e;
                const { height, width, left, top } = button.getBoundingClientRect();
                const x = clientX - (left + width / 2);
                const y = clientY - (top + height / 2);
                xTo(x * 0.3);
                yTo(y * 0.3);
            };

            const handleMouseLeave = () => {
                xTo(0);
                yTo(0);
            };

            button.addEventListener("mousemove", handleMouseMove);
            button.addEventListener("mouseleave", handleMouseLeave);

            return () => {
                button.removeEventListener("mousemove", handleMouseMove);
                button.removeEventListener("mouseleave", handleMouseLeave);
            };
        }, [magnetic]);

        const baseStyles = "relative inline-flex items-center justify-center overflow-hidden px-8 py-3.5 rounded-full font-body text-sm uppercase tracking-widest font-medium transition-all duration-500 will-change-transform";

        const variants = {
            primary: "bg-espresso text-marble hover:bg-black",
            secondary: "bg-gold text-white hover:bg-[#b5924d]",
            outline: "border border-espresso/20 text-espresso hover:border-espresso hover:bg-espresso hover:text-marble",
            ghost: "text-espresso hover:bg-black/5"
        };

        return (
            <button
                ref={(node) => {
                    buttonRef.current = node;
                    if (typeof ref === 'function') ref(node);
                    else if (ref) ref.current = node;
                }}
                className={cn(baseStyles, variants[variant], className)}
                {...props}
            >
                <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">{children}</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity hover:opacity-100 z-0"></div>
            </button>
        );
    }
);
Button.displayName = 'Button';
