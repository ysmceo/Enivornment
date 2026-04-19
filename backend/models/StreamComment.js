const mongoose = require('mongoose');

const streamCommentSchema = new mongoose.Schema(
  {
    streamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stream',
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Sender name too long'],
    },
    senderRole: {
      type: String,
      enum: ['user', 'authority', 'admin'],
      default: 'user',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [800, 'Comment cannot exceed 800 characters'],
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

streamCommentSchema.index({ roomId: 1, createdAt: -1 });
streamCommentSchema.index({ streamId: 1, createdAt: -1 });

module.exports = mongoose.model('StreamComment', streamCommentSchema);
