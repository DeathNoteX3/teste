export interface StoreLink {
  id: string;
  name: string;
  isNotBivolt: boolean;
  url: string;
  url110v: string;
  url220v: string;
}

export interface Product {
  id: string;
  name: string;
  stores: StoreLink[];
}

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface ChecklistTemplateItem {
  key: string;
  label: string;
}

export interface Stage {
  id: string;
  name: string;
  tasks: ChecklistTemplateItem[];
}


export interface PostPublicationChecklistItem {
  key: 'likePoints' | 'fixedComment';
  label: string;
  completed: boolean;
}

export interface Video {
  id:string;
  title: string;
  description: string;
  tags: string;
  script: string;
  thumbnail: string; // Can be a URL or a base64 data URI
  products: Product[];
  postDate: string; // YYYY-MM-DD
  chapters: string;
  checklist: ChecklistItem[];
  postPublicationChecklist?: PostPublicationChecklistItem[];
  videoNumber?: number;
}

export enum ThumbnailSource {
  URL = 'url',
  UPLOAD = 'upload',
}