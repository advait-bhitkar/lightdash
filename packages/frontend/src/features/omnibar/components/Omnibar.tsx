import {
    getSearchResultId,
    SearchFilters,
    SearchItemType,
} from '@lightdash/common';
import {
    ActionIcon,
    Input,
    Loader,
    MantineProvider,
    Modal,
    rem,
    Stack,
    Transition,
    useMantineTheme,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure, useHotkeys } from '@mantine/hooks';
import { IconCircleXFilled, IconSearch } from '@tabler/icons-react';
import { FC, MouseEventHandler, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import MantineIcon from '../../../components/common/MantineIcon';
import { PAGE_CONTENT_WIDTH } from '../../../components/common/Page/Page';
import { useProject } from '../../../hooks/useProject';
import { useValidationUserAbility } from '../../../hooks/validation/useValidation';
import { useTracking } from '../../../providers/TrackingProvider';
import { EventName } from '../../../types/Events';
import useSearch, { OMNIBAR_MIN_QUERY_LENGTH } from '../hooks/useSearch';
import { allSearchItemTypes, SearchItem } from '../types/searchItem';
import { isSearchResultEmpty } from '../utils/isSearchResultEmpty';
import OmnibarEmptyState from './OmnibarEmptyState';
import OmnibarFilters from './OmnibarFilters';
import OmnibarItemGroups from './OmnibarItemGroups';
import OmnibarTarget from './OmnibarTarget';

interface Props {
    projectUuid: string;
}

const Omnibar: FC<Props> = ({ projectUuid }) => {
    const history = useHistory();
    const location = useLocation();
    const { data: projectData } = useProject(projectUuid);
    const { track } = useTracking();
    const theme = useMantineTheme();

    const canUserManageValidation = useValidationUserAbility(projectUuid);

    const [openPanels, setOpenPanels] =
        useState<SearchItemType[]>(allSearchItemTypes);

    const [searchFilters, setSearchFilters] = useState<SearchFilters>();
    const [query, setQuery] = useState<string>();
    const [debouncedValue] = useDebouncedValue(query, 300);

    const { data: searchResults, isFetching } = useSearch(
        projectUuid,
        debouncedValue,
        searchFilters,
    );

    const [isOmnibarOpen, { open: openOmnibar, close: closeOmnibar }] =
        useDisclosure(false);

    const handleOmnibarOpenInputClick: MouseEventHandler<HTMLInputElement> = (
        e,
    ) => {
        e.currentTarget.blur();

        track({
            name: EventName.GLOBAL_SEARCH_OPEN,
            properties: {
                action: 'input_click',
            },
        });

        openOmnibar();
    };

    const handleOmnibarOpenHotkey = () => {
        track({
            name: EventName.GLOBAL_SEARCH_OPEN,
            properties: {
                action: 'hotkeys',
            },
        });

        openOmnibar();
    };

    useHotkeys([
        ['mod + k', handleOmnibarOpenHotkey, { preventDefault: true }],
    ]);

    const handleOmnibarClose = () => {
        track({
            name: EventName.GLOBAL_SEARCH_CLOSED,
            properties: {
                action: 'default',
            },
        });

        closeOmnibar();
    };

    const handleItemClick = (item: SearchItem) => {
        closeOmnibar();

        track({
            name: EventName.SEARCH_RESULT_CLICKED,
            properties: {
                type: item.type,
                id: getSearchResultId(item.item),
            },
        });
        track({
            name: EventName.GLOBAL_SEARCH_CLOSED,
            properties: {
                action: 'result_click',
            },
        });

        history.push(item.location);
        if (
            (item.location.pathname.includes('/tables/') &&
                location.pathname.includes('/tables/')) ||
            (item.location.pathname.includes('/saved/') &&
                location.pathname.includes('/saved/'))
        ) {
            history.go(0); // force page refresh so explore page can pick up the new url params
        }
    };

    const hasEnteredQuery = query !== undefined && query !== '';
    const hasEnteredMinQueryLength =
        hasEnteredQuery && query.length >= OMNIBAR_MIN_QUERY_LENGTH;
    const hasSearchResults =
        searchResults && !isSearchResultEmpty(searchResults);

    return (
        <>
            <Transition
                mounted={!isOmnibarOpen}
                transition="fade"
                duration={400}
                timingFunction="ease"
            >
                {(style) => (
                    <OmnibarTarget
                        placeholder={`Search ${
                            projectData?.name ?? 'your project'
                        }`}
                        style={style}
                        onOpen={handleOmnibarOpenInputClick}
                    />
                )}
            </Transition>

            <MantineProvider inherit theme={{ colorScheme: 'light' }}>
                <Modal
                    withCloseButton={false}
                    size={`calc(${rem(PAGE_CONTENT_WIDTH)} - ${
                        theme.spacing.lg
                    } * 2)`}
                    closeOnClickOutside
                    closeOnEscape
                    opened={isOmnibarOpen}
                    onClose={handleOmnibarClose}
                    yOffset={100}
                    styles={{
                        body: {
                            padding: 0,
                        },
                    }}
                >
                    {/* temporary spacing value before we introduce filtering section */}
                    <Stack spacing={0}>
                        <Input
                            size="xl"
                            icon={
                                isFetching ? (
                                    <Loader size="xs" color="gray" />
                                ) : (
                                    <MantineIcon icon={IconSearch} size="lg" />
                                )
                            }
                            rightSection={
                                query ? (
                                    <ActionIcon
                                        onClick={() => setQuery('')}
                                        color="gray.5"
                                    >
                                        <MantineIcon
                                            icon={IconCircleXFilled}
                                            size="lg"
                                        />
                                    </ActionIcon>
                                ) : null
                            }
                            placeholder={`Search ${
                                projectData?.name ?? 'in your project'
                            }...`}
                            styles={{
                                wrapper: {
                                    position: 'sticky',
                                    zIndex: 1,
                                    top: 0,
                                },
                                input: {
                                    borderTop: 0,
                                    borderRight: 0,
                                    borderLeft: 0,
                                    borderBottomLeftRadius: 0,
                                    borderBottomRightRadius: 0,
                                },
                            }}
                            value={query ?? ''}
                            onChange={(e) => setQuery(e.currentTarget.value)}
                        />

                        <OmnibarFilters
                            filters={searchFilters}
                            onSearchFilterChange={(filters) => {
                                setSearchFilters(filters);
                            }}
                        />

                        {!hasEnteredQuery ? (
                            <OmnibarEmptyState
                                message={`Start typing to search for everything in ${
                                    projectData?.name ?? 'your project'
                                }.`}
                            />
                        ) : !hasEnteredMinQueryLength ? (
                            <OmnibarEmptyState
                                message={`Keep typing to search for everything in ${
                                    projectData?.name ?? 'your project'
                                }.`}
                            />
                        ) : !searchResults ? (
                            <OmnibarEmptyState message="Searching..." />
                        ) : !hasSearchResults ? (
                            <OmnibarEmptyState message="No results found." />
                        ) : (
                            <OmnibarItemGroups
                                searchResults={searchResults}
                                projectUuid={projectUuid}
                                canUserManageValidation={
                                    canUserManageValidation
                                }
                                openPanels={openPanels}
                                onOpenPanelsChange={setOpenPanels}
                                onClick={handleItemClick}
                            />
                        )}
                    </Stack>
                </Modal>
            </MantineProvider>
        </>
    );
};

export default Omnibar;
