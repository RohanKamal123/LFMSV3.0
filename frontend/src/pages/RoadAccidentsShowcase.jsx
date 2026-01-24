import React from 'react';
import {
    Activity, TrendingUp, Map, Truck, Clock, AlertTriangle,
    BarChart3, PieChart, Layers, ShieldCheck, Microscope,
    ChevronRight, Github, ExternalLink, Moon, Info
} from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
        <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
            <Icon size={120} />
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${color} bg-opacity-10 shadow-lg shadow-white/5`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        <h4 className="text-4xl font-black text-white mb-1 tracking-tighter">{value}</h4>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{label}</p>
    </div>
);

const InsightCard = ({ title, subtitle, icon: Icon }) => (
    <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-3xl hover:bg-gray-800/50 hover:border-gray-700 transition-all cursor-pointer group">
        <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform">
                <Icon size={20} />
            </div>
            <div>
                <h5 className="font-black text-white text-sm uppercase leading-none mb-1">{title}</h5>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{subtitle}</p>
            </div>
        </div>
    </div>
);

const MachineLearningCard = ({ title, children, icon: Icon }) => (
    <div className="bg-gray-900/40 border border-gray-800 p-10 rounded-[3rem] relative overflow-hidden h-full">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-purple-500/10 rounded-[1.5rem] text-purple-400">
                <Icon size={32} />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{title}</h3>
        </div>
        <div className="space-y-4 text-gray-400 relative z-10">
            {children}
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Icon size={180} />
        </div>
    </div>
);

const RoadAccidentsShowcase = () => {
    return (
        <div className="min-h-screen bg-black text-gray-300 font-inter selection:bg-indigo-500 selection:text-white">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] bg-purple-900/10 rounded-full blur-[100px]"></div>
                <div className="absolute top-[40%] left-[60%] w-[20%] h-[20%] bg-blue-900/10 rounded-full blur-[80px]"></div>
            </div>

            {/* Navbar */}
            <nav className="relative z-50 px-10 py-8 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl">
                        <Activity size={24} className="text-white" />
                    </div>
                    <span className="text-lg font-black tracking-tighter text-white uppercase">SafeDrive Registry</span>
                </div>
                <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                    <a href="#" className="hover:text-white transition-colors">Analysis</a>
                    <a href="#" className="hover:text-white transition-colors">ML Insights</a>
                    <a href="#" className="hover:text-white transition-colors">Raw Data</a>
                    <button className="bg-white text-black px-6 py-3 rounded-full hover:bg-gray-200 transition-all font-black">
                        GitHub Repo
                    </button>
                </div>
            </nav>

            <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
                {/* Hero Section */}
                <div className="mb-32 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-8 animate-in fade-in slide-in-from-top duration-700">
                        <Moon size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Data Analysis Portfolio</span>
                    </div>
                    <h1 className="text-7xl lg:text-9xl font-black text-white tracking-tighter uppercase mb-6 leading-[0.8] animate-in fade-in slide-in-from-bottom duration-700">
                        Road <br /> Accidents
                    </h1>
                    <p className="text-xl lg:text-2xl text-gray-500 font-medium max-w-3xl leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
                        A comprehensive data-driven analysis of road safety trends across <span className="text-white italic">65 districts</span> in Bangladesh <span className="text-gray-400 underline decoration-indigo-500/50 offset-4">(2014-2026)</span>.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
                    <StatCard label="Total Records" value="2,218" icon={Layers} color="bg-blue-500" />
                    <StatCard label="Total Deaths" value="6,265" icon={AlertTriangle} color="bg-red-500" />
                    <StatCard label="Total Injured" value="8,106" icon={Activity} color="bg-indigo-500" />
                    <StatCard label="Top District" value="Dhaka" icon={Map} color="bg-purple-500" />
                </div>

                {/* Project Summary */}
                <div className="grid lg:grid-cols-2 gap-20 mb-40">
                    <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
                            <span className="w-12 h-[2px] bg-indigo-500"></span>
                            Project Summary
                        </h2>
                        <div className="space-y-6 text-lg text-gray-400 font-medium leading-relaxed">
                            <p>
                                This project provides a critical look into the landscape of road safety in Bangladesh. By analyzing over <span className="text-white">2,200 unique accident reports</span> from the last decade, we have identified key risk factors, geographical hotspots, and temporal patterns.
                            </p>
                            <p>
                                Our findings reveal that while urbanization brings economic growth, it also centralizes accident risks, with <span className="text-indigo-400 font-bold">Dhaka accounting for 25%</span> of all reported incidents. The prevalence of head-on collisions and heavy vehicle involvement underscores the urgent need for better traffic management.
                            </p>
                        </div>
                    </div>
                    <div className="bg-gray-900/30 border border-gray-800 p-10 rounded-[3rem] flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-center relative z-10">
                            <Truck size={80} className="text-indigo-500/20 mb-6 mx-auto animate-bounce" />
                            <h3 className="text-white font-black uppercase text-xl mb-2">Urban Density vs Risk</h3>
                            <p className="text-sm text-gray-500 tracking-widest uppercase font-black">Spatial Correlation Map</p>
                        </div>
                    </div>
                </div>

                {/* Visual Insights Grid */}
                <div className="mb-40">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Visual Insights</h2>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Comprehensive Analysis Verticals</p>
                        </div>
                        <div className="hidden lg:block text-indigo-400 font-black text-[10px] uppercase tracking-widest border border-indigo-400/20 px-6 py-2 rounded-full">
                            14 Analytical Models
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InsightCard title="Time Analysis" subtitle="Time Trends" icon={Clock} />
                        <InsightCard title="District Analysis" subtitle="District Hotspots" icon={Map} />
                        <InsightCard title="Vehicle Analysis" subtitle="Vehicle Impact" icon={Truck} />
                        <InsightCard title="Hourly Analysis" subtitle="Hourly Distribution" icon={Clock} />
                        <InsightCard title="Cause Analysis" subtitle="Primary Causes" icon={AlertTriangle} />
                        <InsightCard title="Severity Analysis" subtitle="Severity Index" icon={Activity} />
                        <InsightCard title="Correlation Heatmap" subtitle="Correlations" icon={BarChart3} />
                        <InsightCard title="Weather Analysis" subtitle="Weather Impact" icon={Activity} />
                        <InsightCard title="Yearly Trends" subtitle="Yearly Evolution" icon={TrendingUp} />
                        <InsightCard title="District Month Heatmap" subtitle="Seasonal Patterns" icon={BarChart3} />
                        <InsightCard title="Vehicle Deaths" subtitle="Fatality vs Vehicle" icon={PieChart} />
                        <InsightCard title="Cause Fatality" subtitle="Cause vs Fatality" icon={AlertTriangle} />
                        <InsightCard title="Hour Day Heatmap" subtitle="Time-Day Matrix" icon={Clock} />
                        <InsightCard title="Monthly TS" subtitle="Time Series" icon={TrendingUp} />
                        <InsightCard title="Top Deadly Accidents" subtitle="Major Events" icon={AlertTriangle} />
                    </div>
                </div>

                {/* ML Insights */}
                <div className="grid lg:grid-cols-12 gap-8 mb-40">
                    {/* Left side info */}
                    <div className="lg:col-span-8">
                        <MachineLearningCard title="Machine Learning Insights" icon={Microscope}>
                            <h4 className="text-white text-xl font-bold mb-4 italic leading-tight">What is this model?</h4>
                            <p className="text-lg leading-relaxed mb-8">
                                We built a <span className="text-indigo-400 font-bold underline underline-offset-4 decoration-indigo-400/30">Random Forest Classification Model</span> that predicts accident severity based on 6 key factors: district, vehicle type, time of day, month, weather conditions, and cause of accident.
                            </p>
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                {[
                                    { label: 'Minor', desc: '0 Deaths', color: 'text-green-400', bg: 'bg-green-400/10' },
                                    { label: 'Moderate', desc: '1-2 Deaths', color: 'text-orange-400', bg: 'bg-orange-400/10' },
                                    { label: 'Severe', desc: '3+ Deaths', color: 'text-red-400', bg: 'bg-red-400/10' },
                                ].map((item, i) => (
                                    <div key={i} className={`${item.bg} p-6 rounded-3xl border border-white/5`}>
                                        <div className={`text-xl font-black ${item.color} uppercase tracking-tighter mb-1`}>{item.label}</div>
                                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-gray-500 font-medium italic">
                                By analyzing 2,218 historical accidents, the model achieves <span className="text-white font-bold">~55% accuracy</span> and reveals which factors most strongly predict fatal outcomes. This helps policymakers focus safety interventions where they matter most.
                            </p>
                        </MachineLearningCard>
                    </div>

                    {/* Feature Importance Side Panel */}
                    <div className="lg:col-span-4">
                        <div className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] h-full flex flex-col">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-3">
                                <TrendingUp className="text-indigo-500" size={20} />
                                Feature Importance
                            </h3>
                            <div className="space-y-8 flex-grow">
                                {[
                                    { label: 'Cause of Accident', value: 22.5, color: 'bg-indigo-500' },
                                    { label: 'Vehicle Type', value: 18.2, color: 'bg-indigo-400' },
                                    { label: 'District Location', value: 15.4, color: 'bg-indigo-300' },
                                    { label: 'Time of Day', value: 12.1, color: 'bg-indigo-200' },
                                    { label: 'Weather', value: 8.5, color: 'bg-indigo-100' },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                            <span>{item.label}</span>
                                            <span className="text-white">{item.value}%</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                            <div className={`${item.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${item.value * 4}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-12 bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                                    Head-on collisions and fires are inherently more deadly than minor fender-benders.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance & Matrix */}
                <div className="grid lg:grid-cols-2 gap-10 mb-40">
                    <div className="bg-gray-900/20 border border-gray-800 p-10 rounded-[3.5rem] relative overflow-hidden">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <ShieldCheck className="text-green-400" size={24} />
                            Confusion Matrix
                        </h3>
                        <div className="bg-black/40 p-1 rounded-[2rem] border border-gray-800 backdrop-blur-sm overflow-hidden mb-8">
                            <div className="grid grid-cols-4 gap-1">
                                <div className="p-4 text-[10px] font-black text-gray-600 uppercase text-center"></div>
                                <div className="p-4 text-[10px] font-black text-gray-400 uppercase text-center">Pred. Minor</div>
                                <div className="p-4 text-[10px] font-black text-gray-400 uppercase text-center bg-indigo-500/5">Pred. Mod</div>
                                <div className="p-4 text-[10px] font-black text-gray-400 uppercase text-center">Pred. Sev</div>

                                <div className="p-6 text-[10px] font-black text-gray-400 uppercase flex items-center">Act. Minor</div>
                                <div className="p-6 text-center font-bold text-gray-600 bg-white/5">45</div>
                                <div className="p-6 text-center font-bold text-indigo-400 bg-indigo-500/20 shadow-inner">165</div>
                                <div className="p-6 text-center font-bold text-gray-600 bg-white/5">32</div>

                                <div className="p-6 text-[10px] font-black text-gray-400 uppercase flex items-center bg-indigo-500/5">Act. Mod</div>
                                <div className="p-6 text-center font-bold text-gray-600 bg-white/5">28</div>
                                <div className="p-6 text-center font-bold text-indigo-400 bg-indigo-500/20">112</div>
                                <div className="p-6 text-center font-bold text-gray-600 bg-white/5">44</div>
                            </div>
                        </div>
                        <p className="text-gray-500 italic text-sm">
                            The model is best at predicting <span className="text-white font-bold">Moderate severity</span> (165 correct predictions). It struggles with Minor accidents, often predicting them as Moderate.
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/20 to-transparent border border-gray-800 p-10 rounded-[3.5rem] flex flex-col justify-center">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Model Performance</h3>
                        <p className="text-lg leading-relaxed text-gray-400 mb-8">
                            Predicting individual outcomes remains challenging as critical human factors (seatbelt use, emergency response time) aren't captured in the 2,218 records. However, the <span className="text-white italic">pattern identification</span> remains viable for strategic road infrastructure planning.
                        </p>
                        <div className="flex gap-4">
                            <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/5 flex-grow">
                                <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Precision</span>
                                <span className="text-2xl font-black text-white">52.4%</span>
                            </div>
                            <div className="bg-white/5 px-6 py-4 rounded-2xl border border-white/5 flex-grow">
                                <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Recall</span>
                                <span className="text-2xl font-black text-white">58.1%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Takeaways Section */}
                <div className="mb-40">
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-16 text-center">Key Takeaways</h2>
                    <div className="grid lg:grid-cols-3 gap-8">
                        {[
                            {
                                title: 'For Policymakers',
                                content: 'Focus on preventing head-on collisions through better road design and traffic enforcement. Target high-risk districts (Dhaka, Chattogram) with enhanced safety measures.',
                                icon: ShieldCheck,
                                color: 'text-indigo-400'
                            },
                            {
                                title: 'For Researchers',
                                content: 'The model shows that weather and time-of-day play smaller roles than expected. Future studies should collect speed data and driver demographics.',
                                icon: Info,
                                color: 'text-blue-400'
                            },
                            {
                                title: 'Limitations',
                                content: 'This model identifies patterns across thousands of cases, it cannot predict individual accidents. Use it for strategic planning, not tactical deployment.',
                                icon: AlertTriangle,
                                color: 'text-gray-400'
                            },
                        ].map((item, i) => (
                            <div key={i} className="bg-gray-900 border border-gray-800 p-10 rounded-[3rem] hover:transform hover:-translate-y-2 transition-all">
                                <div className={`mb-6 ${item.color}`}>
                                    <item.icon size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">{item.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">{item.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary Statistics - Terminal Style */}
                <div className="mb-40">
                    <div className="bg-gray-950 border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-800">
                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            <span className="ml-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Analytics Terminal - Summary Statistics</span>
                        </div>
                        <div className="p-10 font-mono text-sm overflow-x-auto text-indigo-300">
                            <pre className="whitespace-pre">
                                {`======================================================================
ROAD ACCIDENT DATA - SUMMARY STATISTICS
======================================================================

OVERVIEW
----------------------------------------------------------------------
Total Records: 2,218
Date Range: 2014-03-22 to 2026-01-18
Total Deaths: 6,265
Total Injured: 8,106
Unique Districts: 65

TOP 10 DISTRICTS BY ACCIDENTS
----------------------------------------------------------------------
Dhaka: 552            Chattogram: 162
Cumilla: 76           Sylhet: 64
Gazipur: 64           Rajshahi: 59
Mymensingh: 55        Sirajganj: 55
Narayanganj: 50       Tangail: 43

TOP 10 CAUSES OF ACCIDENTS
----------------------------------------------------------------------
head-on collision: 218
collision: 82
road accident: 50
fire: 23
overturned: 22

AVERAGE STATISTICS
----------------------------------------------------------------------
Average Deaths per Accident: 2.82
Average Injured per Accident: 3.65
Max Deaths in Single Accident: 50
Max Injured in Single Accident: 200`}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Footer / Call to Action */}
                <div className="text-center py-20 border-t border-white/5">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">Ready to dive deeper?</h2>
                    <p className="text-gray-500 mb-10 max-w-xl mx-auto">
                        Explore the full raw dataset, comprehensive analysis notebooks, and high-fidelity visualizations on the official project repository.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <button className="bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center gap-3 hover:bg-gray-200 transition-all active:scale-95">
                            <Github size={20} /> View Source Code
                        </button>
                        <button className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] flex items-center gap-3 hover:bg-black transition-all border border-gray-800">
                            <ExternalLink size={20} /> View Raw CSV Data
                        </button>
                    </div>
                    <div className="mt-20">
                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">Project Developed By Nafiul Afk</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RoadAccidentsShowcase;
