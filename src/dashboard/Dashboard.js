const { __, sprintf } = wp.i18n;
import { useEffect, useState } from 'react';
import Pagination from './Pagination';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	CheckboxControl,
	ClipboardButton,
	DropdownMenu,
	Modal,
	Notice,
	SearchControl,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
	__experimentalDivider as Divider,
	__experimentalHeading as Heading,
	__experimentalHStack as HStack,
	__experimentalText as Text,
	__experimentalVStack as VStack,
} from '@wordpress/components';

const API_PATH = '/wp/v2/adpro_option';
const SHOP_PAGE_OPTIONS = [
	[ 'shopPage', __( 'Shop Page', 'well-product-table' ) ],
	[ 'searchPage', __( 'Product Search Page', 'well-product-table' ) ],
	[ 'categoryPage', __( 'Product Category Page', 'well-product-table' ) ],
	[ 'tagPage', __( 'Product Tag Page', 'well-product-table' ) ],
	[ 'attributesPage', __( 'Product Attributes Page', 'well-product-table' ) ],
	[ 'brandPage', __( 'Product Brand Page', 'well-product-table' ) ],
];
const getSettings = ( post ) => {
	try {
		return JSON.parse(
			post.content?.raw || post.content?.rendered || '{}'
		);
	} catch ( error ) {
		return {};
	}
};

const Dashboard = ( { onEdit } ) => {
	const perPage = 5;
	const [ tables, setTables ] = useState( [] );
	const [ page, setPage ] = useState( 1 );
	const [ totalPages, setTotalPages ] = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const [ selected, setSelected ] = useState( [] );
	const [ bulkAction, setBulkAction ] = useState( '' );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );
	const [ hasCopied, setHasCopied ] = useState( null );
	const [ copyingId, setCopyingId ] = useState( null );
	const [ pendingDelete, setPendingDelete ] = useState( [] );
	const [ deleting, setDeleting ] = useState( false );
	const pendingTable =
		pendingDelete.length === 1
			? tables.find( ( table ) => table.id === pendingDelete[ 0 ] )
			: null;

	const loadTables = async () => {
		setLoading( true );
		setError( '' );
		try {
			const response = await wp.apiFetch( {
				path: `${ API_PATH }?context=edit&status=publish,draft&per_page=${ perPage }&page=${ page }&search=${ encodeURIComponent(
					search
				) }`,
				parse: false,
			} );
			setTables( await response.json() );
			setTotalPages(
				Number( response.headers.get( 'X-WP-TotalPages' ) ) || 1
			);
		} catch ( requestError ) {
			setError(
				requestError.message ||
					__( 'Unable to load tables.', 'well-product-table' )
			);
		} finally {
			setLoading( false );
		}
	};
	useEffect( () => {
		loadTables();
	}, [ page, search ] );

	const updateStatus = async ( table ) => {
		try {
			await wp.apiFetch( {
				path: `${ API_PATH }/${ table.id }`,
				method: 'POST',
				data: {
					status: table.status === 'publish' ? 'draft' : 'publish',
				},
			} );
			loadTables();
		} catch ( requestError ) {
			setError( requestError.message );
		}
	};
	const copyTable = async ( table ) => {
		setCopyingId( table.id );
		setError( '' );
		try {
			const title = `${
				table.title?.raw || getSettings( table ).tableName || ''
			} Copy`;
			const settings = { ...getSettings( table ), tableName: title };
			await wp.apiFetch( {
				path: API_PATH,
				method: 'POST',
				data: {
					title,
					content: JSON.stringify( settings ),
					status: 'draft',
				},
			} );
			setPage( 1 );
			if ( page === 1 ) {
				loadTables();
			}
		} catch ( requestError ) {
			setError( requestError.message );
		} finally {
			setCopyingId( null );
		}
	};
	const deleteTables = async () => {
		if ( ! pendingDelete.length ) {
			return;
		}
		setDeleting( true );
		try {
			await Promise.all(
				pendingDelete.map( ( id ) =>
					wp.apiFetch( {
						path: `${ API_PATH }/${ id }?force=true`,
						method: 'DELETE',
					} )
				)
			);
			setSelected( [] );
			setPendingDelete( [] );
			loadTables();
		} catch ( requestError ) {
			setError( requestError.message );
		} finally {
			setDeleting( false );
		}
	};
	const applyBulk = async () => {
		if ( bulkAction === 'delete' ) {
			return setPendingDelete( selected );
		}
		if (
			! selected.length ||
			! [ 'enable', 'disable' ].includes( bulkAction )
		) {
			return;
		}
		try {
			await Promise.all(
				selected.map( ( id ) =>
					wp.apiFetch( {
						path: `${ API_PATH }/${ id }`,
						method: 'POST',
						data: {
							status:
								bulkAction === 'enable' ? 'publish' : 'draft',
						},
					} )
				)
			);
			setSelected( [] );
			loadTables();
		} catch ( requestError ) {
			setError( requestError.message );
		}
	};

	return (
		<>
			<Card style={ { margin: '20px 20px 0 0' } }>
				<CardHeader>
					<VStack style={ { width: '100%' } } spacing={ 3 }>
						<HStack alignment="edge">
							<Heading level={ 3 }>
								{ __( 'Table List', 'well-product-table' ) }
							</Heading>
							<Button
								icon="plus-alt2"
								variant="primary"
								onClick={ () => onEdit( null ) }
							>
								{ __( 'Add New Table', 'well-product-table' ) }
							</Button>
						</HStack>
						<Divider />
						<HStack alignment="edge" spacing={ 3 }>
							<HStack alignment="left" spacing={ 2 }>
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									value={ bulkAction }
									options={ [
										{
											label: __(
												'- Actions -',
												'well-product-table'
											),
											value: '',
										},
										{
											label: __(
												'Delete',
												'well-product-table'
											),
											value: 'delete',
										},
										{
											label: __(
												'Enable',
												'well-product-table'
											),
											value: 'enable',
										},
										{
											label: __(
												'Disable',
												'well-product-table'
											),
											value: 'disable',
										},
									] }
									onChange={ setBulkAction }
								/>
								<Button
									__next40pxDefaultSize
									variant="primary"
									disabled={
										! bulkAction || ! selected.length
									}
									onClick={ applyBulk }
								>
									{ __( 'Apply', 'well-product-table' ) }
								</Button>
							</HStack>
							<SearchControl
								__nextHasNoMarginBottom
								value={ search }
								placeholder={ __(
									'Search…',
									'well-product-table'
								) }
								onChange={ ( value ) => {
									setPage( 1 );
									setSearch( value );
								} }
							/>
						</HStack>
					</VStack>
				</CardHeader>
				<CardBody>
					{ error && (
						<Notice
							status="error"
							isDismissible
							onRemove={ () => setError( '' ) }
						>
							{ error }
						</Notice>
					) }
					{ loading ? (
						<Spinner />
					) : (
						<>
							<div
								className="prta-dashboard-table-scroll"
								role="region"
								tabIndex={ 0 }
								aria-label={ __(
									'Product tables',
									'well-product-table'
								) }
							>
								<div className="prta-dashboard-table">
									<div className="prta-dashboard-row prta-dashboard-head">
										<CheckboxControl
											__nextHasNoMarginBottom
											label={ __(
												'Select all tables on this page',
												'well-product-table'
											) }
											className="prta-selection-checkbox"
											checked={
												tables.length > 0 &&
												selected.length ===
													tables.length
											}
											onChange={ ( checked ) =>
												setSelected(
													checked
														? tables.map(
																( table ) =>
																	table.id
														  )
														: []
												)
											}
										/>
										<Text weight={ 500 }>
											#
											{ __( 'ID', 'well-product-table' ) }
										</Text>
										<Text weight={ 500 }>
											{ __(
												'Table Name',
												'well-product-table'
											) }
										</Text>
										<Text weight={ 500 }>
											{ __(
												'Status',
												'well-product-table'
											) }
										</Text>
										<Text weight={ 500 }>
											{ __(
												'Display In',
												'well-product-table'
											) }
										</Text>
										<Text weight={ 500 }>
											{ __(
												'Shortcode',
												'well-product-table'
											) }
										</Text>
										<Text
											className="prta-dashboard-action"
											weight={ 500 }
										>
											{ __(
												'Action',
												'well-product-table'
											) }
										</Text>
									</div>
									{ ! tables.length && (
										<>
											<Text>
												{ __(
													'No tables found.',
													'well-product-table'
												) }
											</Text>
										</>
									) }
									{ tables.map( ( table ) => {
										const settings = getSettings( table );
										const shortcode = `[product_table id="${ table.id }"]`;
										return (
											<div
												className="prta-dashboard-row"
												key={ table.id }
											>
												<CheckboxControl
													__nextHasNoMarginBottom
													label={ sprintf(
														/* translators: %s: table name. */
														__(
															'Select %s',
															'well-product-table'
														),
														table.title?.raw ||
															settings.tableName ||
															String( table.id )
													) }
													className="prta-selection-checkbox"
													checked={ selected.includes(
														table.id
													) }
													onChange={ ( checked ) =>
														setSelected(
															checked
																? [
																		...selected,
																		table.id,
																  ]
																: selected.filter(
																		(
																			id
																		) =>
																			id !==
																			table.id
																  )
														)
													}
												/>
												<Button
													variant="link"
													onClick={ () =>
														onEdit( table.id )
													}
												>
													#{ table.id }
												</Button>
												<Button
													variant="link"
													onClick={ () =>
														onEdit( table.id )
													}
												>
													{ table.title?.rendered ||
														__(
															'(no title)',
															'well-product-table'
														) }
												</Button>
												<span>
													<ToggleControl
														__nextHasNoMarginBottom
														checked={
															table.status ===
															'publish'
														}
														onChange={ () =>
															updateStatus(
																table
															)
														}
													/>
												</span>
												<div className="prta-dashboard-display">
													{ settings.displayIn ===
													'shop'
														? SHOP_PAGE_OPTIONS.some(
																( [ key ] ) =>
																	settings[
																		key
																	]
														  )
															? SHOP_PAGE_OPTIONS.filter(
																	( [
																		key,
																	] ) =>
																		settings[
																			key
																		]
															  ).map(
																	( [
																		key,
																		label,
																	] ) => (
																		<span
																			key={
																				key
																			}
																		>
																			{
																				label
																			}
																		</span>
																	)
															  )
															: __(
																	'No pages selected',
																	'well-product-table'
															  )
														: __(
																'Shortcode',
																'well-product-table'
														  ) }
												</div>
												<span className="prta-dashboard-shortcode">
													{ settings.displayIn !==
														'shop' && (
														<div className="prta-dashboard-copy">
															<TextControl
																className="adpro-w-full"
																__nextHasNoMarginBottom
																__next40pxDefaultSize
																value={
																	shortcode
																}
																readOnly
																label="shortcode"
																hideLabelFromVision
															/>
															<ClipboardButton
																text={
																	shortcode
																}
																variant="secondary"
																icon={
																	hasCopied ===
																	table.id
																		? 'yes'
																		: 'admin-page'
																}
																label={
																	hasCopied ===
																	table.id
																		? __(
																				'Copied',
																				'well-product-table'
																		  )
																		: __(
																				'Copy shortcode',
																				'well-product-table'
																		  )
																}
																onCopy={ () =>
																	setHasCopied(
																		table.id
																	)
																}
																onFinishCopy={ () =>
																	setHasCopied(
																		null
																	)
																}
															/>
														</div>
													) }
												</span>
												<div className="prta-dashboard-action">
													<DropdownMenu
														icon="ellipsis"
														label={ __(
															'Table actions',
															'well-product-table'
														) }
														controls={ [
															{
																title: __(
																	'Edit',
																	'well-product-table'
																),
																icon: 'edit',
																onClick: () =>
																	onEdit(
																		table.id
																	),
															},
															{
																title: __(
																	'Copy',
																	'well-product-table'
																),
																icon: 'admin-page',
																isDisabled:
																	copyingId ===
																	table.id,
																onClick: () =>
																	copyTable(
																		table
																	),
															},
															{
																title: __(
																	'Delete',
																	'well-product-table'
																),
																icon: 'trash',
																onClick: () =>
																	setPendingDelete(
																		[
																			table.id,
																		]
																	),
															},
														] }
													/>
												</div>
											</div>
										);
									} ) }
								</div>
							</div>
							{ totalPages > 1 && (
								<>
									<Divider margin="5" />
									<Pagination
										currentPage={ page }
										totalPages={ totalPages }
										onPageChange={ setPage }
									/>
								</>
							) }
						</>
					) }
				</CardBody>
			</Card>
			{ pendingDelete.length > 0 && (
				<Modal
					role="alertdialog"
					title={
						pendingDelete.length === 1
							? __( 'Delete table?', 'well-product-table' )
							: __( 'Delete tables?', 'well-product-table' )
					}
					size="small"
					onRequestClose={ () =>
						! deleting && setPendingDelete( [] )
					}
					isDismissible={ ! deleting }
				>
					<p>
						{ pendingTable
							? sprintf(
									/* translators: %s: Product table name. */
									__(
										'Delete “%s”? This cannot be undone.',
										'well-product-table'
									),
									pendingTable.title?.raw ||
										pendingTable.title?.rendered ||
										__( '(no title)', 'well-product-table' )
							  )
							: __(
									'Are you sure you want to delete the selected tables? This cannot be undone.',
									'well-product-table'
							  ) }
					</p>
					<HStack justify="flex-end" spacing={ 2 }>
						<Button
							disabled={ deleting }
							onClick={ () => setPendingDelete( [] ) }
						>
							{ __( 'Cancel', 'well-product-table' ) }
						</Button>
						<Button
							variant="primary"
							isDestructive
							isBusy={ deleting }
							disabled={ deleting }
							onClick={ deleteTables }
						>
							{ __( 'Delete', 'well-product-table' ) }
						</Button>
					</HStack>
				</Modal>
			) }
		</>
	);
};
export default Dashboard;
