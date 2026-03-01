import { useToastStore } from '../store/toastStore';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid';

const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
};

const colors = {
    success: 'bg-green-50 text-green-800 ring-green-600/20',
    error: 'bg-red-50 text-red-800 ring-red-600/20',
    info: 'bg-blue-50 text-blue-800 ring-blue-600/20',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
};

const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
    warning: 'text-yellow-500',
};

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
            {toasts.map((t) => {
                const Icon = icons[t.type];
                return (
                    <div key={t.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg ring-1 ring-inset ${colors[t.type]} animate-in slide-in-from-right-4 duration-300`}>
                        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColors[t.type]}`} />
                        <p className="flex-1 text-sm font-medium">{t.message}</p>
                        <button onClick={() => removeToast(t.id)} className="text-current opacity-50 hover:opacity-100 transition-opacity">
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
