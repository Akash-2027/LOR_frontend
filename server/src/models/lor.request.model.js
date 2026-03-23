import mongoose from 'mongoose';

const lorRequestSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    subject: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    targetUniversity: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    dueDate: { type: String, required: true },
    achievements: { type: String, required: true, trim: true },
    lorRequirements: { type: String, required: true, trim: true },
    documentType: { type: String, enum: ['marksheet', 'idCard'], required: true },
    documentName: { type: String, required: true, trim: true },
    documentData: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    facultyRemark: { type: String, default: '' }
  },
  { timestamps: true }
);

const LorRequest = mongoose.model('LorRequest', lorRequestSchema);

export default LorRequest;
