import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminStories = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryLabels = {
    maison_journal: "The Maison Journal",
    craft_clusters: "Craft & Clusters",
    wearable_whispers: "Wearable Whispers",
    collections_campaigns: "Collections & Campaigns",
    care_keeping: "Care & Keeping",
    press_features: "Press & Features",
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await axios.get(`${API}/stories?published_only=false`);
      setStories(res.data);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storyId) => {
    try {
      await axios.delete(`${API}/stories/${storyId}`);
      toast.success("Story deleted");
      fetchStories();
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  return (
    
      <div data-testid="admin-stories">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#1B4D3E]">Stories</h1>
            <p className="text-[#1B4D3E]/60 mt-1">{stories.length} total stories</p>
          </div>
          <Link
            to="/admin/stories/new"
            data-testid="add-story-btn"
            className="btn-luxury btn-luxury-primary flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" />
            Add Story
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-[#DACBA0]/10 animate-pulse" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#DACBA0]/30">
            <p className="text-[#1B4D3E]/60 mb-4">No stories yet</p>
            <Link to="/admin/stories/new" className="btn-luxury btn-luxury-secondary">
              Create Your First Story
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1B4D3E]/5">
                  <tr>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Story</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Category</th>
                    <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Status</th>
                    <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DACBA0]/20">
                  {stories.map((story) => (
                    <tr key={story.id} className="hover:bg-[#FFFFF0]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 bg-[#DACBA0]/10 flex-shrink-0">
                            {story.hero_media_url && (
                              <img
                                src={story.hero_media_url}
                                alt={story.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#1B4D3E]">{story.title}</p>
                            <p className="text-xs text-[#1B4D3E]/50">{story.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[#1B4D3E]">
                          {categoryLabels[story.category] || story.category}
                        </span>
                      </td>
                      <td className="p-4">
                        {story.is_published ? (
                          <span className="flex items-center gap-1 text-xs text-[#1B4D3E]">
                            <Eye className="w-3 h-3" /> Published
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-[#1B4D3E]/50">
                            <EyeOff className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/stories/${story.id}`}
                            className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-2 text-[#C08081]/60 hover:text-[#C08081] transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#FFFFF0]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-serif text-[#1B4D3E]">
                                  Delete Story
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{story.title}"?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(story.id)}
                                  className="bg-[#C08081] text-white hover:bg-[#C08081]/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    
  );
};

export default AdminStories;
