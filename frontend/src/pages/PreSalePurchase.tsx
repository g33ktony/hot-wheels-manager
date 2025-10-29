import { useState } from 'react'
import Layout from '@/components/common/Layout'
import Card, { CardHeader, CardTitle, CardContent } from '@/components/common/Card'
import PreSalePurchaseForm from '@/components/PreSalePurchaseForm'
import { Package, History } from 'lucide-react'
import { usePreSaleItems } from '@/hooks/usePresale'
import LoadingSpinner from '@/components/common/Loading'

export default function PreSalePurchasePage() {
  const [showForm, setShowForm] = useState(false)
  const { data: presSaleItems = [], isLoading } = usePreSaleItems()

  // Get recent pre-sales (last 5)
  const recentPreSales = presSaleItems.slice(0, 5)

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pre-Sale Management</h1>
            <p className="text-gray-600 mt-1">Register and track pre-sale Hot Wheels purchases</p>
          </div>
        </div>

        {/* Main Form */}
        {showForm ? (
          <PreSalePurchaseForm onClose={() => setShowForm(false)} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ready to register a pre-sale?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Start by registering a new pre-sale purchase. You can set up payment plans, track inventory
                units, and manage delivery schedules.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Package className="w-5 h-5" />
                Register Pre-Sale
              </button>
            </CardContent>
          </Card>
        )}

        {/* Recent Pre-Sales */}
        {!showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Pre-Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : recentPreSales.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pre-sales registered yet</p>
              ) : (
                <div className="space-y-4">
                  {recentPreSales.map((item: any) => (
                    <div key={item._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Car ID</p>
                          <p className="font-semibold">{item.carId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Quantity</p>
                          <p className="font-semibold">{item.totalQuantity} units</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Base Price</p>
                          <p className="font-semibold">${item.basePricePerUnit.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="font-semibold">
                            <span className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              {item.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
