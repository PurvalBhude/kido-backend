import mongoose from 'mongoose';

const eventSettingsSchema = new mongoose.Schema(
  {
    isGlobalRegistrationOpen: {
      type: Boolean,
      default: false,
    },
    isGlobalEarlyBirdActive: {
      type: Boolean,
      default: false,
    },
    eventName: {
      type: String,
      default: 'KidsFest',
      trim: true,
    },
    eventDates: {
      type: String,
      default: '',
      trim: true,
    },
    venue: {
      type: String,
      default: '',
      trim: true,
    },
    announcementBanner: {
      type: String,
      default: '',
      trim: true,
    },
    isBannerActive: {
      type: Boolean,
      default: false,
    },
    isSponsorshipOpen: {
      type: Boolean,
      default: true,
    },
    eventDescription: {
      type: String,
      default: '',
      trim: true,
    },
    heroVideoLink: {
      type: String,
      default: '',
      trim: true,
    },
    locationMapLink: {
      type: String,
      default: '',
      trim: true,
    },
    sponsorshipOpportunities: {
      type: String,
      default: '',
      trim: true,
    },
    navbarLogo: {
      type: String,
      default: '',
    },
    homePassesImage: {
      type: String,
      default: '',
    },
    homeVolunteerImage: {
      type: String,
      default: '',
    },
    homeSponsorImage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Singleton pattern — only one document should exist
eventSettingsSchema.statics.getInstance = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const EventSettings = mongoose.model('EventSettings', eventSettingsSchema);

export default EventSettings;
