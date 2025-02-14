import { Comment } from '@lightdash/common';
import { Avatar, Button, Grid, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Editor, JSONContent } from '@tiptap/react';
import { FC, useMemo, useState } from 'react';
import { useOrganizationUsers } from '../../../hooks/useOrganizationUsers';
import { SuggestionsItem } from '../types';
import { getNameInitials } from '../utils';
import { CommentWithMentions } from './CommentWithMentions';

type Props = {
    userName: string;
    onSubmit: (
        text: string,
        html: string,
        mentions: string[],
    ) => Promise<string>;
    isSubmitting: boolean;
    onCancel?: () => void;
    mode?: 'reply' | 'new';
};

const parseMentions = (data: JSONContent): string[] => {
    const mentions = (data.content || []).flatMap(parseMentions);
    if (data.type === 'mention' && data.attrs?.id) {
        mentions.push(data.attrs.id);
    }

    const uniqueMentions = [...new Set(mentions)];

    return uniqueMentions;
};

export const CommentForm: FC<Props> = ({
    userName,
    onSubmit,
    isSubmitting,
    onCancel,
    mode = 'new',
}) => {
    const { data: listUsers, isSuccess } = useOrganizationUsers();
    let userNames: SuggestionsItem[] = useMemo(
        () =>
            listUsers?.map((user) => ({
                label: user.firstName + ' ' + user.lastName,
                id: user.userUuid,
            })) || [],

        [listUsers],
    );

    const [shouldClearEditor, setShouldClearEditor] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);

    const commentForm = useForm<Pick<Comment, 'replyTo'>>({
        initialValues: {
            replyTo: '',
        },
    });

    const handleSubmit = commentForm.onSubmit(async () => {
        if (editor === null || editor.getText().trim() === '') return;

        onSubmit(
            editor.getText(),
            editor.getHTML(),
            parseMentions(editor.getJSON()),
        );
        setShouldClearEditor(true);
    });

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing="xs" mt="xs">
                <Grid columns={24}>
                    <Grid.Col span={2}>
                        <Avatar radius="xl" size="sm">
                            {getNameInitials(userName)}
                        </Avatar>
                    </Grid.Col>
                    <Grid.Col span={22}>
                        {isSuccess && userNames && (
                            <CommentWithMentions
                                readonly={false}
                                suggestions={userNames}
                                shouldClearEditor={shouldClearEditor}
                                setShouldClearEditor={setShouldClearEditor}
                                onUpdate={setEditor}
                            />
                        )}
                    </Grid.Col>
                </Grid>
                <Group position="right" spacing="xs">
                    {onCancel && (
                        <Button
                            compact
                            variant="default"
                            size="xs"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}

                    <Button
                        compact
                        loading={isSubmitting}
                        size="xs"
                        sx={{
                            alignSelf: 'flex-end',
                        }}
                        type="submit"
                    >
                        {mode === 'reply' ? 'Reply' : 'Add comment'}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
};
