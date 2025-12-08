'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Phone, Mail, Calendar, Users, Search, Plus, Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { Note } from '@/lib/types'

interface ClientNotesProps {
  clientId: string
  clientName: string
}

export function ClientNotes({ clientId, clientName }: ClientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [newNote, setNewNote] = useState({
    content: '',
    type: 'note' as Note['type']
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchNotes()
  }, [clientId, search, fetchNotes])

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        limit: '50'
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/notes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes)
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!newNote.content.trim()) return

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          content: newNote.content,
          type: newNote.type,
        }),
      })

      if (response.ok) {
        const note = await response.json()
        setNotes(prev => [note, ...prev])
        setNewNote({ content: '', type: 'note' })
        setIsAddDialogOpen(false)
        toast({
          title: 'Note Added',
          description: 'Note has been added successfully.',
        })
      } else {
        throw new Error('Failed to add note')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const updateNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return

    try {
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editingNote.content,
          type: editingNote.type,
        }),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        setNotes(prev => prev.map(note => 
          note.id === updatedNote.id ? updatedNote : note
        ))
        setEditingNote(null)
        toast({
          title: 'Note Updated',
          description: 'Note has been updated successfully.',
        })
      } else {
        throw new Error('Failed to update note')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(prev => prev.filter(note => note.id !== noteId))
        toast({
          title: 'Note Deleted',
          description: 'Note has been deleted successfully.',
        })
      } else {
        throw new Error('Failed to delete note')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getTypeIcon = (type: Note['type']) => {
    switch (type) {
      case 'call':
        return <Phone className="h-3 w-3" />
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'meeting':
        return <Users className="h-3 w-3" />
      default:
        return <MessageSquare className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: Note['type']) => {
    switch (type) {
      case 'call':
        return 'bg-blue-100 text-blue-800'
      case 'email':
        return 'bg-green-100 text-green-800'
      case 'meeting':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Notes & Communication</span>
            </CardTitle>
            <CardDescription>
              Communication history for {clientName}
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={newNote.type} onValueChange={(value: Note['type']) => setNewNote(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter note content..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addNote}>
                    Add Note
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No notes found matching your search.' : 'No notes yet. Add your first note above.'}
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={getTypeColor(note.type)}>
                      {getTypeIcon(note.type)}
                      <span className="ml-1 capitalize">{note.type}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNote(note)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Edit Note Dialog */}
        <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
            </DialogHeader>
            {editingNote && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editType">Type</Label>
                  <Select 
                    value={editingNote.type} 
                    onValueChange={(value: Note['type']) => 
                      setEditingNote(prev => prev ? { ...prev, type: value } : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editContent">Content</Label>
                  <Textarea
                    id="editContent"
                    value={editingNote.content}
                    onChange={(e) => setEditingNote(prev => 
                      prev ? { ...prev, content: e.target.value } : null
                    )}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditingNote(null)}>
                    Cancel
                  </Button>
                  <Button onClick={updateNote}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}