import React, { useState, useEffect } from "react"
import { useAuth } from './AuthContext'
import "./CurrentInventoryList.css"

const CurrentInventoryList = () => {
    const { token } = useAuth()
    const [currentInventory, setCurrentInventory] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [editForm, setEditForm] = useState({
        name: '',
        quantity: '',
        price: '',
        description: '',
        category: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchCurrentInventory()
    }, [])

    const fetchCurrentInventory = async () => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/current`
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        const data = await response.json()
        setCurrentInventory(data.current_inventory)
        console.log(data.current_inventory)
    }

    const deleteItem = async (itemId) => {
        const apiUrl = `${import.meta.env.VITE_API_URL}/inventory/delete_item/${itemId}`
        try {
            const response = await fetch(apiUrl, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.ok) {
                await fetch(`${import.meta.env.VITE_API_URL}/inventory/renumber`, { 
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                fetchCurrentInventory()
            }else {
                const message = await response.json()
                alert(message.message)
            }
        }
        catch (error) {
            alert("Error deleting item:", error)
        }
    }

    const formatDate = (isoDate) => {
        const date = new Date(isoDate)
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        })
    }

    const openItemDetails = (item) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedItem(null)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        setEditForm({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            description: item.description,
            category: item.category
        })
        setIsEditModalOpen(true)
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false)
        setEditingItem(null)
        setEditForm({
            name: '',
            quantity: '',
            price: '',
            description: '',
            category: ''
        })
    }

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }))
    }

    const handleUpdateSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)

        const data = {
            name: editForm.name,
            quantity: parseInt(editForm.quantity, 10),
            price: parseFloat(editForm.price),
            description: editForm.description,
            category: editForm.category
        }

        const url = `${import.meta.env.VITE_API_URL}/inventory/update_item/${editingItem.itemId}`
        const options = {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        }

        try {
            const response = await fetch(url, options)
            if (response.ok) {
                await fetchCurrentInventory()
                closeEditModal()
            } else {
                const errorData = await response.json()
                alert('Error: ' + (errorData.error || errorData.details || 'Unknown error'))
            }
        } catch (err) {
            alert('Error updating item: ' + err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return <div className="inventory-container">
        <div className="inventory-header">
            <h2>Current Inventory</h2>
        </div>
        <div className="inventory-table-wrapper">
            {currentInventory.length === 0 ? (
                <div className="empty-state">
                    <p>No items in inventory</p>
                </div>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Added Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentInventory.map((item) => (
                            <tr key={item.itemId} onClick={() => openItemDetails(item)} className="clickable-row">
                                <td title={item.itemId}>{item.itemId}</td>
                                <td title={item.name}>{item.name}</td>
                                <td title={item.quantity}>{item.quantity}</td>
                                <td title={`$${item.price.toFixed(2)}`}>${item.price.toFixed(2)}</td>
                                <td title={item.description}>{item.description}</td>
                                <td title={item.category}>{item.category}</td>
                                <td title={formatDate(item.addedDate)}>{formatDate(item.addedDate)}</td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    <div className="action-buttons">
                                        <button className="btn btn-update" onClick={() => openEditModal(item)}>Update</button>
                                        <button className="btn btn-delete" onClick={() => deleteItem(item.itemId)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        
        {isModalOpen && selectedItem && (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Item Details</h3>
                        <button className="modal-close" onClick={closeModal}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div className="detail-row">
                            <span className="detail-label">ID:</span>
                            <span className="detail-value">{selectedItem.itemId}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{selectedItem.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Quantity:</span>
                            <span className="detail-value">{selectedItem.quantity}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Price:</span>
                            <span className="detail-value">${selectedItem.price.toFixed(2)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Description:</span>
                            <span className="detail-value">{selectedItem.description}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Category:</span>
                            <span className="detail-value">{selectedItem.category}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Added Date:</span>
                            <span className="detail-value">{formatDate(selectedItem.addedDate)}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isEditModalOpen && editingItem && (
            <div className="modal-overlay" onClick={closeEditModal}>
                <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>Edit Item</h3>
                        <button className="modal-close" onClick={closeEditModal}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleUpdateSubmit}>
                            <div className="form-group">
                                <label htmlFor="edit-name">Name</label>
                                <input 
                                    type="text" 
                                    id="edit-name" 
                                    value={editForm.name} 
                                    onChange={(e) => handleEditChange('name', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-quantity">Quantity</label>
                                <input 
                                    type="number" 
                                    id="edit-quantity" 
                                    value={editForm.quantity} 
                                    onChange={(e) => handleEditChange('quantity', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-price">Price</label>
                                <input 
                                    type="number" 
                                    id="edit-price" 
                                    step="0.01" 
                                    value={editForm.price} 
                                    onChange={(e) => handleEditChange('price', e.target.value)} 
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-description">Description</label>
                                <textarea 
                                    id="edit-description" 
                                    value={editForm.description} 
                                    onChange={(e) => handleEditChange('description', e.target.value)} 
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="edit-category">Category</label>
                                <input 
                                    type="text" 
                                    id="edit-category" 
                                    value={editForm.category} 
                                    onChange={(e) => handleEditChange('category', e.target.value)} 
                                    required
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-cancel" onClick={closeEditModal}>Cancel</button>
                                <button type="submit" className="btn btn-save" disabled={isSubmitting}>
                                    {isSubmitting ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        )}
    </div>
}

export default CurrentInventoryList