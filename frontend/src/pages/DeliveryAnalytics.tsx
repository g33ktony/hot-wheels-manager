import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { deliveriesService } from '../services/deliveries';
import Card from '../components/common/Card';
import type { Delivery } from '@shared/types';

interface CompletionTrendData {
    date: string;
    completed: number;
    scheduled: number;
}

const DELIVERY_STATUS_COLORS: Record<string, string> = {
    scheduled: '#fbbf24',
    prepared: '#60a5fa',
    completed: '#34d399',
    cancelled: '#ef4444',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
    paid: '#34d399',
    partial: '#f97316',
    pending: '#ef4444',
};

export const DeliveryAnalytics: React.FC = () => {
    const { data: deliveries = [], isLoading, error } = useQuery(
        ['deliveries'],
        () => deliveriesService.getAll(),
        { staleTime: 5 * 60 * 1000 }
    );

    // Calculate delivery status breakdown
    const deliveryStatusData = useMemo(() => {
        const statusCounts = deliveries.reduce(
            (acc: Record<string, number>, delivery: Delivery) => {
                const status = delivery.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const total = deliveries.length;
        return Object.entries(statusCounts)
            .map(([status, count]) => ({
                status: status.charAt(0).toUpperCase() + status.slice(1),
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            }))
            .sort((a, b) => (b.count as number) - (a.count as number));
    }, [deliveries]);

    // Calculate payment status breakdown
    const paymentStatusData = useMemo(() => {
        const paymentCounts = deliveries.reduce(
            (acc: Record<string, number>, delivery: Delivery) => {
                const status = delivery.paymentStatus || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        const total = deliveries.length;
        return Object.entries(paymentCounts)
            .map(([status, count]) => ({
                status: status.charAt(0).toUpperCase() + status.slice(1),
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            }))
            .sort((a, b) => (b.count as number) - (a.count as number));
    }, [deliveries]);

    // Calculate completion rate metrics
    const completionMetrics = useMemo(() => {
        const completed = deliveries.filter((d: Delivery) => d.status === 'completed').length;
        const scheduled = deliveries.filter((d: Delivery) => d.status === 'scheduled').length;
        const prepared = deliveries.filter((d: Delivery) => d.status === 'prepared').length;
        const cancelled = deliveries.filter((d: Delivery) => d.status === 'cancelled').length;

        const completionRate = deliveries.length > 0 ? Math.round((completed / deliveries.length) * 100) : 0;

        return {
            completed,
            scheduled,
            prepared,
            cancelled,
            total: deliveries.length,
            completionRate,
        };
    }, [deliveries]);

    // Calculate payment metrics
    const paymentMetrics = useMemo(() => {
        const paid = deliveries.filter((d: Delivery) => d.paymentStatus === 'paid').length;
        const partial = deliveries.filter((d: Delivery) => d.paymentStatus === 'partial').length;
        const pending = deliveries.filter((d: Delivery) => d.paymentStatus === 'pending').length;

        const paymentRate = deliveries.length > 0 ? Math.round((paid / deliveries.length) * 100) : 0;

        return {
            paid,
            partial,
            pending,
            paymentRate,
        };
    }, [deliveries]);

    // Generate trend data for last 7 days
    const trendData = useMemo(() => {
        const today = new Date();
        const last7Days: CompletionTrendData[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const completedCount = deliveries.filter(
                (d: Delivery) =>
                    d.completedDate &&
                    d.completedDate.toString().startsWith(dateStr) &&
                    d.status === 'completed'
            ).length;

            const scheduledCount = deliveries.filter(
                (d: Delivery) =>
                    d.scheduledDate &&
                    d.scheduledDate.toString().startsWith(dateStr) &&
                    d.status === 'scheduled'
            ).length;

            last7Days.push({
                date: dateStr.split('-').slice(1).join('/'),
                completed: completedCount,
                scheduled: scheduledCount,
            });
        }

        return last7Days;
    }, [deliveries]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg text-slate-400">Cargando analíticas...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg text-red-600">Error cargando datos de entregas</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-slate-700/30 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Analíticas de Entregas</h1>
                <p className="text-slate-400">Vista general del rendimiento y estado de entregas</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total de Entregas</p>
                            <p className="text-3xl font-bold text-white mt-2">{completionMetrics.total}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-blue-500" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Tasa de Completación</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{completionMetrics.completionRate}%</p>
                            <p className="text-xs text-gray-500 mt-1">{completionMetrics.completed} completadas</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Tasa de Pago</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{paymentMetrics.paymentRate}%</p>
                            <p className="text-xs text-gray-500 mt-1">{paymentMetrics.paid} pagadas</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-blue-500" />
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Pendientes</p>
                            <p className="text-3xl font-bold text-amber-600 mt-2">{completionMetrics.scheduled}</p>
                            <p className="text-xs text-gray-500 mt-1">por agendar/preparar</p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-amber-500" />
                    </div>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Delivery Status Pie Chart */}
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Estado de Entregas</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={deliveryStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(props: any) => `${props.status} ${props.percentage}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {deliveryStatusData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={DELIVERY_STATUS_COLORS[entry.status.toLowerCase()] || '#gray'}
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} entregas`} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        {deliveryStatusData.map((item) => (
                            <div key={item.status} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor:
                                                DELIVERY_STATUS_COLORS[item.status.toLowerCase()] || '#gray',
                                        }}
                                    />
                                    <span className="text-sm text-gray-700">{item.status}</span>
                                </div>
                                <span className="text-sm font-medium text-white">
                                    {String(item.count)} ({String(item.percentage)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Payment Status Bar Chart */}
                <Card>
                    <h2 className="text-lg font-semibold text-white mb-4">Estado de Pago</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={paymentStatusData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="status" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value} entregas`} />
                            <Bar dataKey="count" fill="#8884d8" radius={[8, 8, 0, 0]}>
                                {paymentStatusData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={PAYMENT_STATUS_COLORS[entry.status.toLowerCase()] || '#gray'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        {paymentStatusData.map((item) => (
                            <div key={item.status} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor:
                                                PAYMENT_STATUS_COLORS[item.status.toLowerCase()] || '#gray',
                                        }}
                                    />
                                    <span className="text-sm text-gray-700">{item.status}</span>
                                </div>
                                <span className="text-sm font-medium text-white">
                                    {String(item.count)} ({String(item.percentage)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Completion Trend Chart */}
            <Card>
                <h2 className="text-lg font-semibold text-white mb-4">Tendencia Últimos 7 Días</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="completed"
                            stroke="#34d399"
                            name="Completadas"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="scheduled"
                            stroke="#fbbf24"
                            name="Agendadas"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Card>

            {/* Summary Statistics */}
            <Card className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-4">Resumen Detallado</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm text-slate-400">Agendadas</p>
                        <p className="text-2xl font-bold text-blue-600">{completionMetrics.scheduled}</p>
                    </div>
                    <div className="border-l-4 border-sky-500 pl-4">
                        <p className="text-sm text-slate-400">Preparadas</p>
                        <p className="text-2xl font-bold text-sky-600">{completionMetrics.prepared}</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-4">
                        <p className="text-sm text-slate-400">Completadas</p>
                        <p className="text-2xl font-bold text-green-600">{completionMetrics.completed}</p>
                    </div>
                    <div className="border-l-4 border-red-500 pl-4">
                        <p className="text-sm text-slate-400">Canceladas</p>
                        <p className="text-2xl font-bold text-red-600">{completionMetrics.cancelled}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};
