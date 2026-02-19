import { Influencer } from "../types";

const INSTA_API_BASE_URL = "https://insta-api-lz.pages.dev/api";

export const fetchInstagramData = async (username: string): Promise<Partial<Influencer> | null> => {
  try {
    const cleanUsername = username.replace('@', '').trim();
    const response = await fetch(`${INSTA_API_BASE_URL}?username=${cleanUsername}`);
    
    if (!response.ok) {
      console.error(`Error fetching data for ${username}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`API Error for ${username}: ${data.error}`);
      return null;
    }

    const userInfo = data.user_info;
    const metrics = data.metrics?.total_loaded || {};

    return {
      name: userInfo.full_name,
      handle: `@${userInfo.username}`,
      followerCount: formatCount(userInfo.follower_count),
      engagementRate: metrics.engagement || "N/A",
      bioUrl: `https://www.instagram.com/${userInfo.username}`,
      profilePicUrl: userInfo.profile_pic_url,
      location: userInfo.category || "",
    };
  } catch (error) {
    console.error(`Failed to fetch Instagram data for ${username}:`, error);
    return null;
  }
};

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
};
