import Room from '../models/Room.js';

// GET all active rooms
export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ room_no: 1 });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET single room by ID
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Error fetching room by ID:', error);
    res.status(500).json({ message: error.message });
  }
};

// CREATE new room
export const createRoom = async (req, res) => {
  try {
    const room = new Room(req.body);
    const savedRoom = await room.save();
    res.status(201).json(savedRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Room number already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

// UPDATE room
export const updateRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(400).json({ message: error.message });
  }
};

// DELETE (soft delete) room
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: error.message });
  }
};

// BULK CREATE rooms
export const bulkCreateRooms = async (req, res) => {
  try {
    const rooms = req.body;

    const formattedRooms = rooms.map(r => {
      const room_no = String(r.room_no || '').trim();
      const block = String(r.block || '').trim();
      const floor_no = Number(r.floor_no);
      const capacity = Number(r.capacity);
      const room_type = String(r.room_type || '').toLowerCase().trim();

      // Basic validation
      if (!room_no || isNaN(floor_no) || !block || isNaN(capacity) || !room_type) {
        throw new Error('Invalid room data in uploaded file');
      }

      return {
        room_no,
        floor_no,
        block,
        capacity,
        room_type,
        isActive: true
      };
    });

    // Check for existing rooms
    const existingRoomNos = await Room.find({
      room_no: { $in: formattedRooms.map(r => r.room_no) }
    }).select('room_no');

    const existingRoomSet = new Set(existingRoomNos.map(r => r.room_no));

    // Filter out duplicates
    const newRooms = formattedRooms.filter(r => !existingRoomSet.has(r.room_no));

    const savedRooms = await Room.insertMany(newRooms, { ordered: false });

    res.status(201).json({
      message: `${savedRooms.length} new rooms created successfully`,
      skipped: formattedRooms.length - savedRooms.length,
      duplicates: [...existingRoomSet],
      rooms: savedRooms
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(400).json({ message: error.message });
  }
};
