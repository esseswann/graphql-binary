import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Kek: any;
};

export enum Enumerable {
  First = 'FIRST',
  Second = 'SECOND',
  Third = 'THIRD'
}

export type InputMap = {
  int?: Maybe<Scalars['Int']>;
  inputMap?: Maybe<InputMap>;
  inputListScalar?: Maybe<Array<Maybe<Scalars['Int']>>>;
  inputListMap?: Maybe<Array<Maybe<InputMap>>>;
};


export type Map = {
  __typename?: 'Map';
  id?: Maybe<Scalars['ID']>;
  map?: Maybe<Map>;
  maps?: Maybe<Array<Maybe<Map>>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  noArgs?: Maybe<Scalars['String']>;
};

export type Query = {
  __typename?: 'Query';
  int?: Maybe<Scalars['Int']>;
  float?: Maybe<Scalars['Float']>;
  boolean?: Maybe<Scalars['Boolean']>;
  string?: Maybe<Scalars['String']>;
  map?: Maybe<Map>;
  scalarArray?: Maybe<Array<Maybe<Scalars['String']>>>;
  mapArray?: Maybe<Array<Maybe<Map>>>;
  withArgs?: Maybe<Scalars['String']>;
};


export type QueryWithArgsArgs = {
  int?: Maybe<Scalars['Int']>;
  float?: Maybe<Scalars['Float']>;
  boolean?: Maybe<Scalars['Boolean']>;
  string?: Maybe<Scalars['String']>;
  enum?: Maybe<Enumerable>;
  inputMap?: Maybe<InputMap>;
};

export type Subscription = {
  __typename?: 'Subscription';
  noArgs?: Maybe<Scalars['String']>;
};

export type BasicQueryVariables = Exact<{ [key: string]: never; }>;


export type BasicQuery = { __typename?: 'Query', int?: Maybe<number>, float?: Maybe<number>, boolean?: Maybe<boolean>, string?: Maybe<string>, withArgs?: Maybe<string>, scalarArray?: Maybe<Array<Maybe<string>>>, mapArray?: Maybe<Array<Maybe<{ __typename?: 'Map', id?: Maybe<string>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string>, maps?: Maybe<Array<Maybe<{ __typename?: 'Map', id?: Maybe<string> }>>> }> }>>>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string> }> }> }> };

export type WithArgsQueryVariables = Exact<{ [key: string]: never; }>;


export type WithArgsQuery = { __typename?: 'Query', int?: Maybe<number>, float?: Maybe<number>, boolean?: Maybe<boolean>, string?: Maybe<string>, withArgs?: Maybe<string>, scalarArray?: Maybe<Array<Maybe<string>>>, mapArray?: Maybe<Array<Maybe<{ __typename?: 'Map', id?: Maybe<string>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string>, maps?: Maybe<Array<Maybe<{ __typename?: 'Map', id?: Maybe<string> }>>> }> }>>>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string>, map?: Maybe<{ __typename?: 'Map', id?: Maybe<string> }> }> }> };

export type NoArgsMutationVariables = Exact<{ [key: string]: never; }>;


export type NoArgsMutation = { __typename?: 'Mutation', noArgs?: Maybe<string> };

export type WithVariablesQueryVariables = Exact<{
  A?: Maybe<Scalars['Int']>;
  B?: Maybe<Scalars['Float']>;
  C?: Maybe<Scalars['Boolean']>;
  D?: Maybe<Scalars['String']>;
  E?: Maybe<Enumerable>;
}>;


export type WithVariablesQuery = { __typename?: 'Query', withArgs?: Maybe<string> };

export type BasicNoArgsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type BasicNoArgsSubscription = { __typename?: 'Subscription', noArgs?: Maybe<string> };


export const BasicDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Basic"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"int"}},{"kind":"Field","name":{"kind":"Name","value":"float"}},{"kind":"Field","name":{"kind":"Name","value":"boolean"}},{"kind":"Field","name":{"kind":"Name","value":"string"}},{"kind":"Field","name":{"kind":"Name","value":"withArgs"}},{"kind":"Field","name":{"kind":"Name","value":"scalarArray"}},{"kind":"Field","name":{"kind":"Name","value":"mapArray"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]}}]} as unknown as DocumentNode<BasicQuery, BasicQueryVariables>;
export const WithArgsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WithArgs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"int"}},{"kind":"Field","name":{"kind":"Name","value":"float"}},{"kind":"Field","name":{"kind":"Name","value":"boolean"}},{"kind":"Field","name":{"kind":"Name","value":"string"}},{"kind":"Field","name":{"kind":"Name","value":"withArgs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"int"},"value":{"kind":"IntValue","value":"1"}},{"kind":"Argument","name":{"kind":"Name","value":"float"},"value":{"kind":"FloatValue","value":"1.5"}},{"kind":"Argument","name":{"kind":"Name","value":"boolean"},"value":{"kind":"BooleanValue","value":true}},{"kind":"Argument","name":{"kind":"Name","value":"string"},"value":{"kind":"StringValue","value":"string","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"enum"},"value":{"kind":"EnumValue","value":"FIRST"}}]},{"kind":"Field","name":{"kind":"Name","value":"scalarArray"}},{"kind":"Field","name":{"kind":"Name","value":"mapArray"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"maps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"map"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]}}]} as unknown as DocumentNode<WithArgsQuery, WithArgsQueryVariables>;
export const NoArgsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NoArgs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noArgs"}}]}}]} as unknown as DocumentNode<NoArgsMutation, NoArgsMutationVariables>;
export const WithVariablesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WithVariables"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"A"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"B"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"C"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"D"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"E"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Enumerable"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"withArgs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"int"},"value":{"kind":"Variable","name":{"kind":"Name","value":"A"}}},{"kind":"Argument","name":{"kind":"Name","value":"float"},"value":{"kind":"Variable","name":{"kind":"Name","value":"B"}}},{"kind":"Argument","name":{"kind":"Name","value":"boolean"},"value":{"kind":"Variable","name":{"kind":"Name","value":"C"}}},{"kind":"Argument","name":{"kind":"Name","value":"string"},"value":{"kind":"Variable","name":{"kind":"Name","value":"D"}}},{"kind":"Argument","name":{"kind":"Name","value":"enum"},"value":{"kind":"Variable","name":{"kind":"Name","value":"E"}}}]}]}}]} as unknown as DocumentNode<WithVariablesQuery, WithVariablesQueryVariables>;
export const BasicNoArgsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"BasicNoArgs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"noArgs"}}]}}]} as unknown as DocumentNode<BasicNoArgsSubscription, BasicNoArgsSubscriptionVariables>;