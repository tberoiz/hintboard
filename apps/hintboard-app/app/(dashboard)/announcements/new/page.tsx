import { AnnouncementEditor } from "@/features/announcements/components/announcement-editor";

export const metadata = {
  title: "New Announcement",
};

export default async function NewAnnouncementRoute() {
  return <AnnouncementEditor />;
}
