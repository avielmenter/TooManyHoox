# TooManyHoox
Simple state management using React's hooks and context API

# About

TooManyHoox is a simple state management library created to use React's hooks and context APIs. Hoox is similar to libraries like Redux, except that it is invoked via a custom hook, rather than through a component decorator.

# Examples

TooManyHoox can be used either to create a state management pattern within a single component, or provide access to a store across many components using the context API.

## Single Component

```javascript
import { useStore, useHoox } from 'toomanyhoox';

function reducer(state, action) {
	switch (action.type) {
		case 'SpoilTheBroth':
			return ...;

		// . . . 

		default:
			return state;
	}
}

const mapStateToProps = (state) => ({
	message: state.text
})

const mapDispatchToProps = (dispatch) => ({
	someAction: (params) => dispatch({
		type: "SpoilTheBroth",
		params
	}),
	// . . . 
});

const component = (props) => {
	const store = useStore(
		reducer,
		{ text: "initial state" }
	);

	const { state, actions } = useHoox(
		store, 
		mapStateToProps, 
		mapDispatchToProps
	);

	// . . .
}
```

## Multiple Components

First, create the store.

```javascript
import { createStore } from 'toomanyhoox';

const { store, useStore } = createStore(
	reducer,
	{ text: "initial state" }
);
```

Then, wrap the top of the component tree in a context provider. This step is necessary for the store to be accessible in components within the wrapped component.

```javascript
import { HooxProvider } from 'toomanyhoox';

const App = (props) => (
	<HooxProvider store={store}>
		<!-- . . . -->
	</HooxProvider>
);
```

Now, the store can be accessed from functional components contained within the provider.

```javascript
const component = (props) => {
	const { state, actions } = useStore(
		mapStateToProps,
		mapDispatchToProps
	);

	// . . .
}
```

## Middleware

Middleware can be used to add custom functionality to the dispatch function. Middleware functions take the current state, action, and dispatch function, and return a new dispatch function.

This example middleware writes the type of every action dispatched to the console.

```javascript
const logger = (state) => (dispatch) => (action) => {
	console.log(action.type);
	dispatch(action);
}
```

The logger can then be added to any store when it is created.

```javascript
const { store, useStore } = createStore(
		reducer,
		initialState,
		[logger, /* . . .*/]
);
```

# License
This project is licensed under the [MIT License](https://github.com/avielmenter/toomanyhoox/blob/master/LICENSE).