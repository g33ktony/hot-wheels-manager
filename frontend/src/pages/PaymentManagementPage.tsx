import React, { useState } from 'react'
import { useOverduePayments, useRecordPayment, usePaymentPlanById, usePaymentSchedule, usePaymentAnalytics } from '@/hooks/usePayments'
import PaymentStats from '@/components/PaymentManagement/PaymentStats'
import OverduePaymentsAlert from '@/components/PaymentManagement/OverduePaymentsAlert'
import PaymentPlanTracker from '@/components/PaymentManagement/PaymentPlanTracker'
import PaymentHistoryTable from '@/components/PaymentManagement/PaymentHistoryTable'
import PaymentAnalytics from '@/components/PaymentManagement/PaymentAnalytics'
import { AlertCircle, RefreshCw } from 'lucide-react'

const PaymentManagementPage: React.FC = () => {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'analytics'>('overview')

  // Queries
  const { data: overduePayments, isLoading: overdueLoading, refetch: refetchOverdue } = useOverduePayments()
  const { data: selectedPlan } = usePaymentPlanById(selectedPaymentId || '')
  const { data: schedule, isLoading: scheduleLoading } = usePaymentSchedule(selectedPaymentId || '')
  const { data: analytics, isLoading: analyticsLoading } = usePaymentAnalytics(selectedPaymentId || '')
  const { mutate: recordPayment, isLoading: recordingPayment } = useRecordPayment()

  // Calculate totals
  const totalAmount = (selectedPlan?.totalAmount || 0)
  const totalPaid = (selectedPlan?.totalPaid || 0)
  const remainingAmount = (selectedPlan?.remainingAmount || 0)
  const overdueAmount = (selectedPlan?.hasOverduePayments ? remainingAmount : 0) || 0

  const handleRecordPayment = (amount: number, paymentDate: Date, notes?: string) => {
    if (!selectedPaymentId) return

    recordPayment(
      { paymentPlanId: selectedPaymentId, amount, paymentDate, notes },
      {
        onSuccess: () => {
          alert('Pago registrado exitosamente')
        },
        onError: (error: any) => {
          alert(`Error: ${error.message}`)
        },
      }
    )
  }

  const mockTransactions = schedule?.map((item, idx) => ({
    _id: `${selectedPaymentId}-${idx}`,
    date: item.paidDate || item.dueDate,
    amount: item.amount,
    type: 'payment' as const,
    notes: item.notes,
    status: item.paid ? 'completed' : 'pending' as const,
  })) || []

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Pagos</h1>
            <p className="text-gray-600 mt-1">Administra planes de pago y registra transacciones</p>
          </div>
          <button
            onClick={() => refetchOverdue()}
            disabled={overdueLoading}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${overdueLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Overdue Alert */}
        {overduePayments && overduePayments.length > 0 && (
          <OverduePaymentsAlert
            overduePayments={overduePayments.map((p: any) => ({
              _id: p._id,
              deliveryId: p.deliveryId,
              deliveryNumber: p.deliveryNumber || 'N/A',
              customerName: p.customerName || 'Cliente desconocido',
              dueDate: new Date(p.dueDate),
              amount: p.totalAmount,
              overdueAmount: p.remainingAmount,
              daysPastDue: Math.floor(
                (new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)
              ),
              notes: p.notes,
            }))}
            isLoading={overdueLoading}
            onPaymentClick={setSelectedPaymentId}
          />
        )}

        {/* Stats */}
        {selectedPlan && (
          <PaymentStats
            totalAmount={totalAmount}
            totalPaid={totalPaid}
            remainingAmount={remainingAmount}
            overdueAmount={overdueAmount}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'plans'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Planes de Pago
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            Análisis
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {selectedPlan && schedule ? (
                <>
                  <PaymentPlanTracker
                    paymentPlan={{
                      _id: selectedPlan._id || '',
                      totalAmount: selectedPlan.totalAmount,
                      numberOfPayments: selectedPlan.numberOfPayments,
                      amountPerPayment: selectedPlan.amountPerPayment,
                      paymentFrequency: selectedPlan.paymentFrequency,
                      totalPaid: selectedPlan.totalPaid,
                      remainingAmount: selectedPlan.remainingAmount,
                      paymentsCompleted: selectedPlan.paymentsCompleted,
                      hasOverduePayments: selectedPlan.hasOverduePayments,
                    }}
                    schedule={schedule.map((item: any) => ({
                      dueDate: new Date(item.dueDate),
                      amount: item.amount,
                      paid: item.paid,
                      paidDate: item.paidDate ? new Date(item.paidDate) : undefined,
                      isOverdue: item.isOverdue,
                      notes: item.notes,
                    }))}
                    isLoading={recordingPayment}
                    onRecordPayment={handleRecordPayment}
                  />
                  <PaymentHistoryTable
                    transactions={mockTransactions.map((t: any) => ({
                      ...t,
                      status: (t.status === 'completed' || t.status === 'pending' || t.status === 'failed' ? t.status : 'pending') as 'completed' | 'pending' | 'failed',
                    }))}
                    isLoading={scheduleLoading}
                  />
                </>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Selecciona un plan de pago</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Haz clic en "Registrar Pago" en la alerta de pagos vencidos para comenzar
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-4">
              {overduePayments && overduePayments.length > 0 ? (
                overduePayments.map((payment: any) => (
                  <div
                    key={payment._id}
                    onClick={() => setSelectedPaymentId(payment._id)}
                    className={`bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                      selectedPaymentId === payment._id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">Entrega #{payment.deliveryNumber}</h3>
                        <p className="text-sm text-gray-600">{payment.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${payment.totalAmount.toLocaleString('es-CO')}</p>
                        <p className="text-sm text-gray-600">
                          {payment.paymentsCompleted} de {payment.numberOfPayments} pagos
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No hay planes de pago pendientes</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <>
              {analytics ? (
                <PaymentAnalytics
                  analytics={analytics}
                  isLoading={analyticsLoading}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Selecciona un plan de pago</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Elige un plan de la sección "Planes de Pago" para ver análisis
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentManagementPage
