import Dexie, { Table } from 'dexie';
import type { Product, Invoice, DraftInvoice, StockMovement, Customer, Supplier, PurchaseInvoice, ShopProfile, PrintSettings, BillingSettings, SupabaseConfig } from '../types';

export class WebRajyaDatabase extends Dexie {
  products!: Table<Product, string>;
  invoices!: Table<Invoice, string>;
  drafts!: Table<DraftInvoice, string>;
  stockMovements!: Table<StockMovement, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  purchaseInvoices!: Table<PurchaseInvoice, string>;
  auditLogs!: Table<any, string>;
  keyValueSettings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('WebRajyaStationeryDB');
    this.version(1).stores({
      products: 'id, barcode, name, category, hsnCode, stockQty, synced, updatedAt',
      invoices: 'id, invoiceNumber, date, customerName, customerMobile, status, idempotencyKey, synced, createdAt',
      drafts: 'id, draftName, updatedAt',
      stockMovements: 'id, productId, createdAt, type',
      customers: 'id, mobile, name, createdAt',
      auditLogs: 'id, action, recordId, createdAt',
      keyValueSettings: 'key'
    });

    this.version(2).stores({
      products: 'id, barcode, name, category, hsnCode, stockQty, synced, updatedAt',
      invoices: 'id, invoiceNumber, date, customerName, customerMobile, status, idempotencyKey, synced, createdAt',
      drafts: 'id, draftName, updatedAt',
      stockMovements: 'id, productId, createdAt, type',
      customers: 'id, mobile, name, createdAt',
      suppliers: 'id, name, mobile, gstin, createdAt',
      purchaseInvoices: 'id, invoiceNumber, supplierName, invoiceDate, status, synced, createdAt',
      auditLogs: 'id, action, recordId, createdAt',
      keyValueSettings: 'key'
    });
  }
}

export const db = new WebRajyaDatabase();

// Default Shop Profile Settings (Mart & Supermarket)
export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopName: 'Sukhya Mart',
  tagline: 'Supermarket & Daily Needs',
  address: 'Main Commercial Market, Central Plaza',
  phone: '+91 98765 43210',
  email: 'contact@sukhyamart.com',
  gstin: '',
  state: 'Madhya Pradesh (23)',
  pincode: '480661',
  bankName: 'State Bank of India',
  accountNo: '',
  ifscCode: '',
  upiId: 'sukhyamart@upi',
  invoicePrefix: 'SM-',
  termsAndConditions: '1. Goods once sold can be exchanged within 2 days with original bill.\n2. No exchange on dairy & frozen items.\n3. Thank you for shopping with Sukhya Mart!'
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A5',
  printEngine: 'auto',
  autoCutPaper: true,
  openCashDrawer: false,
  showGstBreakdown: true,
  showBankDetails: true,
  showTerms: true,
  autoPrintOnSave: true
};

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  defaultInvoiceType: 'gst',
  showAdvancedModes: false,
  enableBos: false,
  enableChallan: false,
  enableEstimate: false,
  enableIgst: true,
  whatsappFormat: 'text',
  whatsappPdfStyle: 'a5'
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: 'https://qgkbkkodosgcvqvaouxf.supabase.co',
  anonKey: 'sb_publishable_5wp7W3kttM0chFtGkVp6bQ_vJl1m7HN',
  autoSync: true,
  lastSyncAt: null
};
