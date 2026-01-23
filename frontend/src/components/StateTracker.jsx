import { Check, Clock, Package, UserCheck, CheckCircle2, Archive } from 'lucide-react';

const STATES = [
    { id: 'ACTIVE', label: 'Reported', icon: Package },
    { id: 'PENDING_HANDOVER', label: 'Verification', icon: Clock },
    { id: 'READY_FOR_PICKUP', label: 'To Room 110', icon: UserCheck },
    { id: 'RESOLVED', label: 'Resolved', icon: CheckCircle2 },
];

const StateTracker = ({ currentState }) => {
    // Find index of current state to determine active/completed
    const currentIndex = STATES.findIndex(s => s.id === currentState) || 0;

    return (
        <div className="w-full py-4">
            <div className="relative flex items-center justify-between">
                {/* Connection Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 transition-all duration-500 -z-10"
                    style={{ width: `${(currentIndex / (STATES.length - 1)) * 100}%` }}
                ></div>

                {STATES.map((state, index) => {
                    const Icon = state.icon;
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;

                    return (
                        <div key={state.id} className="flex flex-col items-center bg-gray-50 px-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive || isCompleted
                                        ? 'bg-white border-green-500 text-green-600'
                                        : 'bg-white border-gray-300 text-gray-400'
                                    } ${isActive ? 'ring-4 ring-green-100 scale-110' : ''}`}
                            >
                                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                            </div>
                            <span className={`text-xs font-semibold mt-2 ${isActive ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                {state.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StateTracker;
