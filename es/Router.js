var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

import invariant from 'invariant';
import React from 'react';
import createReactClass from 'create-react-class';
import { func, object } from 'prop-types';

import _createTransitionManager from './createTransitionManager';
import { routes } from './InternalPropTypes';
import RouterContext from './RouterContext';
import { createRoutes } from './RouteUtils';
import { createRouterObject as _createRouterObject, assignRouterState } from './RouterUtils';
import warning from './routerWarning';

var propTypes = {
  history: object,
  children: routes,
  routes: routes, // alias for children
  render: func,
  createElement: func,
  onError: func,
  onUpdate: func,

  // PRIVATE: For client-side rehydration of server match.
  matchContext: object
};

var prefixUnsafeLifecycleMethods = typeof React.forwardRef !== 'undefined';

/**
 * A <Router> is a high-level API for automatically setting up
 * a router that renders a <RouterContext> with all the props
 * it needs each time the URL changes.
 */
var Router = createReactClass({
  displayName: 'Router',

  propTypes: propTypes,

  getDefaultProps: function getDefaultProps() {
    return {
      render: function render(props) {
        return React.createElement(RouterContext, props);
      }
    };
  },
  getInitialState: function getInitialState() {
    return {
      location: null,
      routes: null,
      params: null,
      components: null
    };
  },
  handleError: function handleError(error) {
    if (this.props.onError) {
      this.props.onError.call(this, error);
    } else {
      // Throw errors by default so we don't silently swallow them!
      throw error; // This error probably occurred in getChildRoutes or getComponents.
    }
  },
  createRouterObject: function createRouterObject(state) {
    var matchContext = this.props.matchContext;

    if (matchContext) {
      return matchContext.router;
    }

    var history = this.props.history;

    return _createRouterObject(history, this.transitionManager, state);
  },
  createTransitionManager: function createTransitionManager() {
    var matchContext = this.props.matchContext;

    if (matchContext) {
      return matchContext.transitionManager;
    }

    var history = this.props.history;
    var _props = this.props,
        routes = _props.routes,
        children = _props.children;


    !history.getCurrentLocation ? process.env.NODE_ENV !== 'production' ? invariant(false, 'You have provided a history object created with history v4.x or v2.x ' + 'and earlier. This version of React Router is only compatible with v3 ' + 'history objects. Please change to history v3.x.') : invariant(false) : void 0;

    return _createTransitionManager(history, createRoutes(routes || children));
  },


  // this method will be updated to UNSAFE_componentWillMount below for React versions >= 16.3
  componentWillMount: function componentWillMount() {
    var _this = this;

    this.transitionManager = this.createTransitionManager();
    this.router = this.createRouterObject(this.state);

    this._unlisten = this.transitionManager.listen(function (error, state) {
      if (error) {
        _this.handleError(error);
      } else {
        // Keep the identity of this.router because of a caveat in ContextUtils:
        // they only work if the object identity is preserved.
        assignRouterState(_this.router, state);
        _this.setState(state, _this.props.onUpdate);
      }
    });
  },
  componentWillUnmount: function componentWillUnmount() {
    if (this._unlisten) this._unlisten();
  },
  componentDidUpdate: function componentDidUpdate(previousProps) {
    var _this2 = this;

    var _props2 = this.props,
        routes = _props2.routes,
        children = _props2.children;


    var newRoutes = createRoutes(routes || children);
    var prevRoutes = createRoutes(previousProps.routes || previousProps.children);

    if (JSON.stringify(prevRoutes) === JSON.stringify(newRoutes)) {
      return;
    }
    this.transitionManager.setRoutes(newRoutes, function (error, state) {
      if (error) {
        _this2.handleError(error);
      } else {
        // Keep the identity of this.router because of a caveat in ContextUtils:
        // they only work if the object identity is preserved.

        if (JSON.stringify(_this2.state.routes) !== JSON.stringify(state.routes)) {
          var hasChanged = _this2.state.components.toString() !== state.components.toString();
          var newState = _extends({}, _this2.state, { routes: state.routes });

          if (hasChanged) {
            newState.components = state.components;
          }

          assignRouterState(_this2.router, newState);
          _this2.setState(newState);
        }
      }
    });
  },
  render: function render() {
    var _state = this.state,
        location = _state.location,
        routes = _state.routes,
        params = _state.params,
        components = _state.components;

    var _props3 = this.props,
        createElement = _props3.createElement,
        render = _props3.render,
        props = _objectWithoutProperties(_props3, ['createElement', 'render']);

    if (location == null) return null; // Async match

    // Only forward non-Router-specific props to routing context, as those are
    // the only ones that might be custom routing context props.
    Object.keys(propTypes).forEach(function (propType) {
      return delete props[propType];
    });

    return render(_extends({}, props, {
      router: this.router,
      location: location,
      routes: routes,
      params: params,
      components: components,
      createElement: createElement
    }));
  }
});

if (prefixUnsafeLifecycleMethods) {
  Router.prototype.UNSAFE_componentWillMount = Router.prototype.componentWillMount;
  delete Router.prototype.componentWillMount;
}

export default Router;