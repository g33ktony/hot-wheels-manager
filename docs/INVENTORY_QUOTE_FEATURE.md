# Inventory Quote Report Feature

## Overview
This feature allows you to select multiple items from the inventory and generate a professional quote/report in PDF format to share with clients who are interested in purchasing those items.

## How to Use

### 1. Activate Selection Mode
- Navigate to the Inventory page
- Click the "Seleccionar" button in the header section
- The page will enter selection mode

### 2. Select Items
- Click on any inventory items you want to include in the quote
- Selected items will show a blue checkmark
- You can select as many items as needed (2 or more recommended)
- Use "Seleccionar Todo" to select all visible items
- Use "Deseleccionar" to clear your selection

### 3. Generate Quote
- Once you have items selected, click the "Generar Cotización" button
- A modal will open showing a preview of the quote report

### 4. Customize Prices (Preview Mode)
- In the preview, you can edit individual prices by clicking the pencil icon (✏️) next to any price
- Enter the custom price you want to show to the client
- Click the checkmark to save or X to cancel
- The total will automatically update

### 5. Add Notes (Optional)
- Use the notes textarea at the top to add any special conditions or information
- These notes will appear at the bottom of the final report

### 6. Export and Share
You have two options:

#### Download PDF
- Click "Descargar PDF" to generate and download a PDF file
- The PDF will be named with a timestamp (e.g., `cotizacion-1736123456789.pdf`)
- Perfect for sending via email or messaging apps

#### Share Directly
- Click "Compartir" to use your device's native share functionality
- On mobile devices, this will open the system share sheet
- You can share directly to WhatsApp, email, Telegram, etc.
- On desktop, if sharing is not supported, it will offer to download instead

## Report Contents

The generated report includes:
- **Header**: Company name and "Cotización de Inventario" title
- **Date**: Current date in Spanish format
- **Items Table**: Shows for each item:
  - Item number
  - Photo thumbnail
  - Model name and series
  - Brand (Hot Wheels, Mini GT, etc.)
  - Piece type (Básico, Premium, RLC, etc.)
  - Condition (mint, good, fair, poor)
  - Custom price (editable in preview)
- **Summary**: Subtotal and total in Mexican Pesos (MXN)
- **Notes**: Any additional notes you added
- **Footer**: Validity notice and contact information

## Features

### Price Customization
- Each item's price can be individually customized before generating the report
- Default prices are taken from `actualPrice` or `suggestedPrice`
- Useful for offering discounts or special pricing to specific clients

### Professional Format
- Clean, branded layout with blue gradient header
- Organized table with item photos
- Clear pricing and totals
- Mobile-friendly and print-ready

### Multiple Export Options
- PDF format for email attachments
- Image sharing for messaging apps
- Direct system share on mobile devices

## Technical Details

### Component Location
- `/frontend/src/components/InventoryQuoteReport.tsx`

### Dependencies
- `html2canvas`: For capturing the report as an image
- `jspdf`: For generating PDF files
- React hooks for state management

### Integration
- Integrated into the Inventory page selection mode
- Appears alongside "Publicar en Facebook" and "Eliminar" buttons
- Uses the same selection mechanism as bulk operations

## Tips

1. **Select Quality Photos**: The first photo of each item will appear in the report, so make sure items have good primary photos

2. **Price Strategy**: You can offer different prices than your regular inventory prices without affecting your actual inventory pricing

3. **Use Notes Wisely**: Add payment terms, delivery information, or special offers in the notes section

4. **Validate Before Sharing**: Always review the preview before generating the final PDF to ensure prices and information are correct

5. **Multiple Quotes**: You can create different quotes for different clients with different pricing by adjusting prices in the preview

## Future Enhancements (Potential)

- Save quote templates
- Client information section
- Quote expiration date customization  
- Multiple currency support
- Discount percentage application
- Quote tracking and history
