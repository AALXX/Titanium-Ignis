import React from 'react';
import { ArrowRight, CheckCircle, Users, Briefcase, Code, TrendingUp, Zap, Shield } from 'lucide-react';
import Link from 'next/link';

const Home = () => {
    return (
        <div className="flex h-full flex-col overflow-y-auto  text-white">
            {/* Hero Section */}
            <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
                
                <div className="relative z-10 flex max-w-5xl flex-col items-center text-center">
                    <div className="mb-6 inline-flex items-center rounded-full bg-blue-600/20 px-4 py-2 text-sm text-blue-400 backdrop-blur-sm">
                        <Zap className="mr-2 h-4 w-4" />
                        Streamlined Project Management
                    </div>
                    
                    <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl lg:text-7xl">
                        Manage Projects with
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Precision</span>
                    </h1>
                    
                    <p className="mb-10 max-w-2xl text-lg text-neutral-300 md:text-xl">
                        Titanium-Ignis is a comprehensive project management solution designed for small to medium-sized businesses. Streamline finances, employees, deployments, and more with technology-focused features.
                    </p>
                    
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Link href={"/account"} className="group flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold transition-all hover:bg-blue-700">
                            Get Started
                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                  
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-neutral-800/50 px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-4xl font-bold">Powerful Features</h2>
                        <p className="text-lg text-neutral-400">Everything you need to manage your projects effectively</p>
                    </div>
                    
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon={<Briefcase className="h-8 w-8" />}
                            title="Financial Management"
                            description="Track budgets, expenses, and financial health across all your projects with detailed analytics."
                        />
                        <FeatureCard
                            icon={<Users className="h-8 w-8" />}
                            title="Team Management"
                            description="Manage team members, roles, and permissions efficiently with intuitive controls."
                        />
                        <FeatureCard
                            icon={<Code className="h-8 w-8" />}
                            title="Code Integration"
                            description="Connect with your development workflow and track code deployments seamlessly."
                        />
                        <FeatureCard
                            icon={<TrendingUp className="h-8 w-8" />}
                            title="Real-time Analytics"
                            description="Monitor project progress with live statistics and comprehensive reporting."
                        />
                        <FeatureCard
                            icon={<CheckCircle className="h-8 w-8" />}
                            title="Task Management"
                            description="Organize and prioritize tasks with an intuitive task list and tracking system."
                        />
                        <FeatureCard
                            icon={<Shield className="h-8 w-8" />}
                            title="Secure & Reliable"
                            description="Enterprise-grade security with role-based access control and data protection."
                        />
                    </div>
                </div>
            </section>

      
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div className="group rounded-xl border border-neutral-700 bg-neutral-800/30 p-6 backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-neutral-800/50">
        <div className="mb-4 inline-flex rounded-lg bg-blue-600/20 p-3 text-blue-400 transition-colors group-hover:bg-blue-600/30">
            {icon}
        </div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="text-neutral-400">{description}</p>
    </div>
);

const StatCard = ({ number, label }) => (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-8 text-center backdrop-blur-sm">
        <div className="mb-2 text-4xl font-bold text-blue-400">{number}</div>
        <div className="text-neutral-400">{label}</div>
    </div>
);

export default Home;