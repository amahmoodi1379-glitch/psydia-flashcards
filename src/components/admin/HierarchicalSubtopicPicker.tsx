import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, FolderTree, FileText } from 'lucide-react';

interface Subject {
  id: string;
  title: string;
  topics?: Topic[];
}

interface Topic {
  id: string;
  title: string;
  subject_id: string;
  subtopics?: SubtopicItem[];
}

interface SubtopicItem {
  id: string;
  title: string;
  topic_id: string;
}

interface HierarchicalSubtopicPickerProps {
  subjects: Subject[];
  topics: Topic[];
  subtopics: SubtopicItem[];
  value: string;
  onValueChange: (subtopicId: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function HierarchicalSubtopicPicker({
  subjects,
  topics,
  subtopics,
  value,
  onValueChange,
  label = 'ساب‌تاپیک',
  required = false,
  placeholder,
}: HierarchicalSubtopicPickerProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');

  const topicsBySubject = useMemo(() => {
    const map: Record<string, Topic[]> = {};
    topics.forEach((t) => {
      if (!map[t.subject_id]) map[t.subject_id] = [];
      map[t.subject_id].push(t);
    });
    return map;
  }, [topics]);

  const subtopicsByTopic = useMemo(() => {
    const map: Record<string, SubtopicItem[]> = {};
    subtopics.forEach((st) => {
      if (!map[st.topic_id]) map[st.topic_id] = [];
      map[st.topic_id].push(st);
    });
    return map;
  }, [subtopics]);

  // Reverse-lookup: when value changes externally, sync the subject/topic selects
  useEffect(() => {
    if (!value) {
      // Don't clear cascade selects when value is empty — preserve user's subject/topic choice
      return;
    }
    const st = subtopics.find((s) => s.id === value);
    if (st) {
      const topic = topics.find((t) => t.id === st.topic_id);
      if (topic) {
        setSelectedSubjectId(topic.subject_id);
        setSelectedTopicId(topic.id);
      }
    }
  }, [value, subtopics, topics]);

  const filteredTopics = topicsBySubject[selectedSubjectId] || [];
  const filteredSubtopics = subtopicsByTopic[selectedTopicId] || [];

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedTopicId('');
    onValueChange('');
  };

  const handleTopicChange = (topicId: string) => {
    setSelectedTopicId(topicId);
    onValueChange('');
  };

  const handleSubtopicChange = (subtopicId: string) => {
    onValueChange(subtopicId);
  };

  // Build display text for the current selection
  const selectedDisplay = useMemo(() => {
    if (!value) return null;
    const st = subtopics.find((s) => s.id === value);
    if (!st) return null;
    const topic = topics.find((t) => t.id === st.topic_id);
    const subject = topic ? subjects.find((s) => s.id === topic.subject_id) : null;
    return `${subject?.title || '?'} › ${topic?.title || '?'} › ${st.title}`;
  }, [value, subtopics, topics, subjects]);

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {/* Current selection badge */}
      {selectedDisplay && (
        <div className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg truncate">
          {selectedDisplay}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Subject Select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            درس
          </Label>
          <Select value={selectedSubjectId} onValueChange={handleSubjectChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="انتخاب درس" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Topic Select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <FolderTree className="h-3 w-3" />
            تاپیک
          </Label>
          <Select
            value={selectedTopicId}
            onValueChange={handleTopicChange}
            disabled={!selectedSubjectId}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={selectedSubjectId ? 'انتخاب تاپیک' : '—'} />
            </SelectTrigger>
            <SelectContent>
              {filteredTopics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subtopic Select */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            ساب‌تاپیک
          </Label>
          <Select
            value={value}
            onValueChange={handleSubtopicChange}
            disabled={!selectedTopicId}
          >
            <SelectTrigger
              className={`h-9 text-sm ${required && !value ? 'border-destructive' : ''}`}
            >
              <SelectValue placeholder={selectedTopicId ? (placeholder || 'انتخاب ساب‌تاپیک') : '—'} />
            </SelectTrigger>
            <SelectContent>
              {filteredSubtopics.map((subtopic) => (
                <SelectItem key={subtopic.id} value={subtopic.id}>
                  {subtopic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
