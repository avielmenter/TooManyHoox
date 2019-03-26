import * as React from 'react';

// TYPE DEFINITIONS

/**
 * Takes a state and an action, and produces a new state.
 * @typedef {(state: State, action: Action) => State} Reducer<State,Action>
 * @param {State} State The type of the state accepted and produced by the reducer
 * @param {Action} Action The type of actions can modify the state
 */
export type Reducer<State, Action> = (state: State, action: Action) => State;

/**
 * The type of the dispatch function used to dispatch an action
 * @typedef {React.Dispatch<Action>} Dispatch<Action>
 * @param {Action} Action The type of actions that can be dispatched
 */
export type Dispatch<Action> = React.Dispatch<Action>;

/**
 * The type of a middleware function that can process an action before dispatchment
 * @typedef {(state: State) => (dispatch: Dispatch<Action>) => Dispatch<Action>} Middleware<State,Action>
 * @param {State} State The type of state accepted and produced by the reducer
 * @param {Action} Action The type of actions can modify the state
 */
export type Middleware<State, Action> = (state: State)
	=> (dispatch: Dispatch<Action>)
		=> Dispatch<Action>;

/**
 * Contains the current state, and a dispatch functions used to modify the state
 * @typedef {state: State, dispatch: Dispatch} Store<State,Action>
 * @param {State} State the type of state accepted and produced by the reducer
 * @param {Action} Action the type of actions can modify the state
 */
export type Store<State, Action> = {
	state: State,
	dispatch: Dispatch<Action>
}

/**
 * Contains the current state, and an object with functions used to dispatch actions
 * @typedef {State: State, actions: DispatchProps} StoreProps<State,DispatchProps>
 * @param {State} State the type of state accepted and produced by the reducer
 * @param {DispatchProps} DispatchProps the object with functions used to dispatch actions
 */
export type StoreProps<State, DispatchProps> = {
	state: State,
	actions: DispatchProps
}

/**
 * The type of the React context associated with the store
 * @typedef {React.Context<Store<State,Action>>} StoreContext<State,Action>
 * @param {State} State the type of state accepted and produced by the reducer
 * @param {Action} Action the type of actions that can modify the state
 */
type StoreContext<State, Action> = React.Context<Store<State, Action>>;

/**
 * Contains the configuration information for the store
 * @typedef {reducer: Reducer<State,Action>, state: State, middleware: Middleware<State,Action> | Middleware<State,Action>[] | undefined, context: StoreContext<State,Action>} StoreConfig<State,Action>
 * @param {State} State the type of state accepted and produced by the reducer
 * @param {Action} Action the type of actions that can modify the state
 */
type StoreConfig<State, Action> = {
	reducer: Reducer<State, Action>,
	state: State,
	middleware?: Middleware<State, Action> | Middleware<State, Action>[],
	context: StoreContext<State, Action>
};

// EXCEPTIONS

export type EXCEPTION_TYPE
	= "HOOX_COMBINE_NO_REDUCERS"
	| "HOOX_REDUCER_RETURNS_UNDEFINED";

export type HooxException = {
	type: EXCEPTION_TYPE | "HOOX_UNKNOWN",
	message: string,
	data?: any
}

function exceptionMessage(type: EXCEPTION_TYPE): string {
	switch (type) {
		case "HOOX_COMBINE_NO_REDUCERS":
			return "You must provide at least one reducer to combineReducers";

		case "HOOX_REDUCER_RETURNS_UNDEFINED":
			return "Reducers must not return undefined or null";
	}
}

const hooxException: (type: EXCEPTION_TYPE, data?: any) => HooxException = (type, data) => ({
	type,
	message: exceptionMessage(type),
	data
});

// UTIL

/**
 * Combines reducers for different properties of the state into a single reducer for the whole state
 * @param reducers An object with a reducer for each property of the state
 * @returns {Reducer<State,Action>} The combined reducer
 */
export function combineReducers<S, A>(reducers: { [K in keyof S]: Reducer<S, A> }): Reducer<S, A> {
	if (reducers == {})
		throw hooxException("HOOX_COMBINE_NO_REDUCERS");

	return (s: S, a: A) => {
		let state = s;

		for (const k in reducers) {
			state = reducers[k](state, a);
		}

		if (!state)
			throw hooxException("HOOX_REDUCER_RETURNS_UNDEFINED");

		return state;
	}
}

// REDUCER CUSTOM HOOKS

/**
 * Custom hook to create a store
 * @param {Reducer<State,Action>} reducer The reducer for the store
 * @param {State} state The initial state in the store 
 * @param {Middleware<State,Action> | Middleware<State, Action> | undefined} middleware The middleware, if any, used in the store
 * @returns {Store<State,Action>} The store
 */
export function useStore<State, Action>(
	reducer: Reducer<State, Action>,
	state: State,
	middleware?: Middleware<State, Action> | Middleware<State, Action>[]
): Store<State, Action> {
	const [currState, defaultDispatch] = React.useReducer(
		reducer,
		state
	);

	const dispatch = middleware
		? (middleware instanceof Array
			? middleware.reduce((p, c) => c(currState)(p), defaultDispatch)
			: middleware(currState)(defaultDispatch)
		)
		: defaultDispatch;

	return {
		state: currState,
		dispatch
	};
};

/**
 * Takes a store or store context and produces a store with actions to modify the state
 * @param {Store<State,Action> | StoreContext<State,Action} store The store or store context
 * @param {(state: State) => MappedState} mapStateToProps A function mapping the full state to the state used here
 * @param {(dispatch: Dispatch<Action>) => DispatchProps} mapDispatchToProps A function producing the dispatch props
 * @returns {StoreProps<MappedState, DispatchProps>} A store with a state, and an object with functions to modify the state
 */
export function useHoox<State, Action, DispatchProps, MappedState = State>(
	store: Store<State, Action> | StoreContext<State, Action>,
	mapStateToProps?: (state: State) => MappedState,
	mapDispatchToProps?: (dispatch: Dispatch<Action>) => DispatchProps
): StoreProps<MappedState, DispatchProps> {
	const hooxStore: Store<State, Action> = (store as StoreContext<State, Action>).Consumer
		? React.useContext(store as StoreContext<State, Action>)
		: store as Store<State, Action>;

	return {
		state: mapStateToProps
			? mapStateToProps(hooxStore.state)
			: hooxStore.state as any as MappedState,
		actions: mapDispatchToProps
			? mapDispatchToProps(hooxStore.dispatch)
			: { dispatch: hooxStore.dispatch } as any as DispatchProps
	}
}

// CONTEXT CUSTOM HOOKS

/**
 * Creates a store configuration file that can be used to create a store context, and a custom hook for using the store
 * @param {Reducer<State, Action>} reducer The reducer for the store
 * @param {State} state The initial state in the store
 * @param {Middleware<State,Action> | Middleware<State,Action>[] | undefined} middleware The middleware run before an action is dispatched
 * @returns {store: StoreConfig<State,Action>, useStore: StoreHook<State, Action, DispatchProps, MappedState = State>)} The store configuration and hook 
 */
export function createStore<State, Action>(
	reducer: Reducer<State, Action>,
	state: State,
	middleware?: Middleware<State, Action> | Middleware<State, Action>[]
) {
	const dispatch: Dispatch<Action> = (_) => { };

	const store: StoreConfig<State, Action> = {
		reducer,
		state,
		middleware,
		context: React.createContext({
			state,
			dispatch
		})
	};

	return {
		store,
		useStore: <MappedState, DispatchProps>(
			mapStateToProps: (state: State) => MappedState,
			mapDispatchToProps: (dispatch: Dispatch<Action>) => DispatchProps
		) => useHoox(React.useContext(store.context), mapStateToProps, mapDispatchToProps)
	};
}

type ComponentProps<State, Action> = {
	store: StoreConfig<State, Action>
}

/**
 * The context provider for a store
 * @param {StoreConfig<State,Action>} store The configuration for the store to provide 
 */
export const HooxProvider: <State, Action>(
	props: ComponentProps<State, Action> & { children?: React.ReactNode }
) => React.ReactElement<any> = (props) => {
	const { reducer, state, middleware, context } = props.store;

	return (
		<context.Provider value={useStore(reducer, state, middleware)}>
			{props.children}
		</context.Provider>
	);
};