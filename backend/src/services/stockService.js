const supabase = require('../config/supabase')

async function getInventoryRow(inventory_id) {
  const { data, error } = await supabase
    .from('inventory')
    .select('qty_in_stock')
    .eq('inventory_id', inventory_id)
    .single()
  if (error) throw error
  return data
}

async function decrementStock(inventory_id, qty) {
  const row = await getInventoryRow(inventory_id)
  if (row.qty_in_stock < qty) {
    const err = new Error('Insufficient stock')
    err.status = 400
    throw err
  }
  const { error } = await supabase
    .from('inventory')
    .update({ qty_in_stock: row.qty_in_stock - qty, updated_at: new Date().toISOString() })
    .eq('inventory_id', inventory_id)
  if (error) throw error
}

async function incrementStock(inventory_id, qty) {
  const row = await getInventoryRow(inventory_id)
  const { error } = await supabase
    .from('inventory')
    .update({ qty_in_stock: row.qty_in_stock + qty, updated_at: new Date().toISOString() })
    .eq('inventory_id', inventory_id)
  if (error) throw error
}

async function adjustStock(inventory_id, qty_adjusted) {
  const row = await getInventoryRow(inventory_id)
  const newQty = row.qty_in_stock + qty_adjusted
  if (newQty < 0) {
    const err = new Error('Adjustment would result in negative stock')
    err.status = 400
    throw err
  }
  const { error } = await supabase
    .from('inventory')
    .update({ qty_in_stock: newQty, updated_at: new Date().toISOString() })
    .eq('inventory_id', inventory_id)
  if (error) throw error
}

// skipStatusUpdate=true when the PO was already created as 'received' (complete flow)
async function receivePurchaseOrder(purchase_order_id, received_date, items, skipStatusUpdate = false) {
  for (const item of items) {
    if (!skipStatusUpdate) {
      const { error: updateItem } = await supabase
        .from('purchase_order_items')
        .update({ qty_received: item.qty_received })
        .eq('po_item_id', item.po_item_id)
      if (updateItem) throw updateItem
    }

    const { data: existing } = await supabase
      .from('inventory')
      .select('inventory_id, qty_in_stock')
      .eq('purchase_order_id', purchase_order_id)
      .eq('product_id', item.product_id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('inventory')
        .update({ qty_in_stock: existing.qty_in_stock + item.qty_received, updated_at: new Date().toISOString() })
        .eq('inventory_id', existing.inventory_id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('inventory').insert({
        product_id:       item.product_id,
        supplier_id:      item.supplier_id,
        purchase_order_id,
        qty_in_stock:     item.qty_received,
        company_price:    item.company_price,
        selling_price:    item.selling_price,
        reorder_level:    item.reorder_level     ?? 5,
        rack_no:          item.rack_no           ?? null,
        bin_no:           item.bin_no            ?? null,
        is_genuine:       item.is_genuine        ?? true,
        discount_percent: item.discount_percent  ?? 0,
      })
      if (error) throw error
    }
  }

  if (!skipStatusUpdate) {
    const { error: poErr } = await supabase
      .from('purchase_orders')
      .update({ status: 'received', received_date })
      .eq('purchase_order_id', purchase_order_id)
    if (poErr) throw poErr
  }
}

module.exports = { decrementStock, incrementStock, adjustStock, receivePurchaseOrder }
