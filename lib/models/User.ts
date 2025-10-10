import { Schema, model, models } from "mongoose"
import { randomBytes } from "crypto"

export interface IUser {
  googleId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  shareToken: string
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      required: false,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: false,
    },
    tokenExpiresAt: {
      type: Date,
      required: false,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => randomBytes(32).toString('hex'),
    },
  },
  {
    timestamps: true,
  },
)

export const User = models.User || model<IUser>("User", UserSchema)
