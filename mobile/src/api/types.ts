export interface PostAuthor {
  id: number;
  name: string;
  avatarUrl: string | null;
  nickname: string | null;
  isPontaFirme: boolean;
}

export interface PostComment {
  id: number;
  text: string;
  user: { id: number; name: string };
  createdAt: string;
}

export interface Post {
  id: number;
  mediaType: 'image' | 'video' | 'text';
  imageUrl: string | null;
  caption: string | null;
  blocked: boolean;
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  likedByMe: boolean;
  comments: PostComment[];
}
