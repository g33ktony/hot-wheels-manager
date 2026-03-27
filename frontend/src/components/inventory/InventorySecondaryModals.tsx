import FacebookPublishModal from '@/components/FacebookPublishModal'
import InventoryQuoteReport from '@/components/InventoryQuoteReport'
import CollageGenerator from '@/components/CollageGenerator'
import BulkEditModal from '@/components/BulkEditModal'
import type { InventoryItem } from '../../../../shared/types'

interface InventorySecondaryModalsProps {
    showFacebookModal: boolean
    showQuoteModal: boolean
    showCollageModal: boolean
    showBulkEditModal: boolean
    selectedItems: InventoryItem[]
    onCloseFacebookModal: () => void
    onFacebookSuccess: () => void
    onCloseQuoteModal: () => void
    onCloseCollageModal: () => void
    onCloseBulkEditModal: () => void
    onBulkEditSave: (updates: Record<string, unknown>) => Promise<void>
}

export default function InventorySecondaryModals({
    showFacebookModal,
    showQuoteModal,
    showCollageModal,
    showBulkEditModal,
    selectedItems,
    onCloseFacebookModal,
    onFacebookSuccess,
    onCloseQuoteModal,
    onCloseCollageModal,
    onCloseBulkEditModal,
    onBulkEditSave,
}: InventorySecondaryModalsProps) {
    return (
        <>
            <FacebookPublishModal
                isOpen={showFacebookModal}
                onClose={onCloseFacebookModal}
                selectedItems={selectedItems}
                onSuccess={onFacebookSuccess}
            />

            {showQuoteModal && (
                <InventoryQuoteReport
                    items={selectedItems}
                    onClose={onCloseQuoteModal}
                />
            )}

            <CollageGenerator
                isOpen={showCollageModal}
                onClose={onCloseCollageModal}
                selectedItems={selectedItems}
            />

            <BulkEditModal
                isOpen={showBulkEditModal}
                onClose={onCloseBulkEditModal}
                selectedItems={selectedItems}
                onSave={onBulkEditSave}
            />
        </>
    )
}
